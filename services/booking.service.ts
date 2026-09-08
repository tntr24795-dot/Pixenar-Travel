/**
 * Pixenar Travel booking domain service — plain server-side TypeScript, no
 * "use client". This is the ONLY place bookings are created, confirmed,
 * cancelled or expired. Route handlers under `app/api/**` are thin wrappers
 * around these functions: they authenticate the caller, then delegate here.
 */
import "server-only";
import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAvailability } from "@/lib/availability/checkAvailability";
import {
  calculateBookingQuote,
  type GuestCounts,
  type ListingPricingInput,
} from "@/lib/pricing/calculateBookingQuote";
import { createBookingPaymentIntent, getStripe } from "@/lib/stripe/server";
import { BOOKING_HOLD_MINUTES } from "@/constants";
import { generateBookingNumber } from "@/lib/utils";
import type { Tables, TablesInsert } from "@/types/database";

export class BookingServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BookingServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CreateBookingHoldParams {
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export interface CreateBookingHoldResult {
  booking: Tables<"bookings">;
  priceItems: Tables<"booking_price_items">[];
}

export async function createBookingHold(params: CreateBookingHoldParams): Promise<CreateBookingHoldResult> {
  const admin = createAdminClient();
  const { data: listing, error: listingError } = await admin.from("listings").select("*").eq("id", params.listingId).single();
  if (listingError || !listing) throw new BookingServiceError("Listing not found.", 404, "listing_not_found");
  if (listing.status !== "active") throw new BookingServiceError("This listing isn't currently bookable.", 422, "listing_not_active");

  const { data: hostProfile, error: hostProfileError } = await admin.from("host_profiles").select("user_id").eq("id", listing.host_id).single();
  if (hostProfileError || !hostProfile) throw new BookingServiceError("Host profile not found.", 404, "host_profile_not_found");

  const availabilityCheck = await checkAvailability(admin, params.listingId, params.checkIn, params.checkOut);
  if (!availabilityCheck.available) throw new BookingServiceError("Those dates aren't available.", 409, availabilityCheck.reason ?? "unavailable");

  const pricingInput: ListingPricingInput = {
    basePriceCents: listing.base_price_cents,
    weekendPriceCents: listing.weekend_price_cents,
    cleaningFeeCents: listing.cleaning_fee_cents,
    extraGuestFeeCents: listing.extra_guest_fee_cents,
    petFeeCents: listing.pet_fee_cents,
    maximumGuests: listing.maximum_guests,
    weeklyDiscountPercent: listing.weekly_discount_percent,
    monthlyDiscountPercent: listing.monthly_discount_percent,
    currency: listing.currency,
    minimumNights: listing.minimum_nights,
    maximumNights: listing.maximum_nights,
  };
  const guests: GuestCounts = { adults: params.adults, children: params.children, infants: params.infants, pets: params.pets };
  const quote = calculateBookingQuote(pricingInput, params.checkIn, params.checkOut, guests, { customPricesByDate: availabilityCheck.customPricesByDate });
  if (!quote.available) throw new BookingServiceError(`These dates aren't bookable (${quote.reason}).`, 422, quote.reason);

  const bookingInsert: TablesInsert<"bookings"> = {
    booking_number: generateBookingNumber(), listing_id: params.listingId, guest_id: params.guestId,
    host_id: hostProfile.user_id, check_in: params.checkIn, check_out: params.checkOut,
    number_of_nights: quote.nights, adults: params.adults, children: params.children, infants: params.infants, pets: params.pets,
    nightly_subtotal_cents: quote.nightlySubtotalCents, cleaning_fee_cents: quote.cleaningFeeCents,
    guest_service_fee_cents: quote.guestServiceFeeCents, host_service_fee_cents: quote.hostCommissionCents,
    pet_fee_cents: quote.petFeeCents, tax_cents: quote.taxCents, discount_cents: quote.discountCents,
    total_cents: quote.totalCents, host_payout_cents: quote.hostPayoutCents, currency: quote.currency,
    status: "pending_payment", payment_status: "unpaid",
    hold_expires_at: new Date(Date.now() + BOOKING_HOLD_MINUTES * 60_000).toISOString(),
  };

  const { data: booking, error: insertError } = await admin.from("bookings").insert(bookingInsert).select().single();
  if (insertError) {
    if (insertError.code === "23P01") throw new BookingServiceError("Those dates were just booked by someone else. Please pick different dates.", 409, "dates_just_booked");
    throw new BookingServiceError(`Failed to create booking: ${insertError.message}`, 500, "booking_insert_failed");
  }
  if (!booking) throw new BookingServiceError("Failed to create booking.", 500, "booking_insert_failed");

  const priceItemsInsert: TablesInsert<"booking_price_items">[] = quote.items.map((item) => ({
    booking_id: booking.id, item_type: item.itemType, description: item.description,
    quantity: item.quantity, unit_amount_cents: item.unitAmountCents, total_amount_cents: item.totalAmountCents,
  }));
  const { data: priceItems, error: priceItemsError } = await admin.from("booking_price_items").insert(priceItemsInsert).select();
  if (priceItemsError) {
    await admin.from("bookings").delete().eq("id", booking.id);
    throw new BookingServiceError("Failed to record the price breakdown for this booking.", 500, "price_items_insert_failed");
  }
  return { booking, priceItems: priceItems ?? [] };
}

export interface ExpireStaleHoldsResult { expiredCount: number; expiredBookingIds: string[]; }
export async function expireStaleHolds(): Promise<ExpireStaleHoldsResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("bookings").update({ status: "expired" }).eq("status", "pending_payment").lt("hold_expires_at", new Date().toISOString()).select("id");
  if (error) throw new BookingServiceError(`Failed to expire stale holds: ${error.message}`, 500, "expire_holds_failed");
  const expiredBookingIds = (data ?? []).map((row) => row.id);
  return { expiredCount: expiredBookingIds.length, expiredBookingIds };
}

export async function confirmBooking(bookingId: string, stripePaymentIntentId: string, stripeChargeId?: string | null): Promise<Tables<"bookings">> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("bookings").update({
    status: "confirmed", payment_status: "paid", confirmed_at: new Date().toISOString(),
    stripe_payment_intent_id: stripePaymentIntentId, stripe_charge_id: stripeChargeId ?? null,
  }).eq("id", bookingId).eq("status", "pending_payment").select().single();
  if (error || !data) throw new BookingServiceError(`Could not confirm booking ${bookingId} after a successful payment — its hold may have already expired or it was cancelled before this webhook arrived. The guest HAS been charged; this needs manual reconciliation (refund and/or rebook).`, 409, "confirm_conflict");
  return data;
}

export interface CreateBookingCheckoutParams { bookingId: string; guestId: string; }
export interface CreateBookingCheckoutResult { clientSecret: string; }
export async function createBookingCheckout(params: CreateBookingCheckoutParams): Promise<CreateBookingCheckoutResult> {
  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin.from("bookings").select("*").eq("id", params.bookingId).single();
  if (bookingError || !booking) throw new BookingServiceError("Booking not found.", 404, "booking_not_found");
  if (booking.guest_id !== params.guestId) throw new BookingServiceError("This booking doesn't belong to you.", 403, "forbidden");
  if (booking.status !== "pending_payment") throw new BookingServiceError("This booking is no longer awaiting payment.", 410, "booking_not_pending_payment");
  if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() < Date.now()) throw new BookingServiceError("Your hold on these dates has expired. Please start a new booking.", 410, "hold_expired");

  const { data: listing, error: listingError } = await admin.from("listings").select("host_id").eq("id", booking.listing_id).single();
  if (listingError || !listing) throw new BookingServiceError("Listing not found.", 404, "listing_not_found");
  const { data: hostProfile, error: hostProfileError } = await admin.from("host_profiles").select("stripe_account_id, charges_enabled").eq("id", listing.host_id).single();
  if (hostProfileError || !hostProfile?.stripe_account_id || !hostProfile.charges_enabled) throw new BookingServiceError("This host isn't ready to accept payments yet. Please try again later.", 422, "host_not_ready_for_payments");

  const stripe = getStripe();
  if (booking.stripe_payment_intent_id) {
    try {
      const existing = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (existing.status !== "canceled" && existing.status !== "succeeded" && existing.client_secret) return { clientSecret: existing.client_secret };
    } catch (err) { console.warn("Could not reuse existing PaymentIntent; creating a new one", err); }
  }

  try {
    const paymentIntent = await createBookingPaymentIntent({
      amountCents: booking.total_cents, currency: booking.currency, bookingId: booking.id,
      destinationAccountId: hostProfile.stripe_account_id, applicationFeeCents: booking.host_service_fee_cents,
    });
    if (!paymentIntent.client_secret) throw new Error("Stripe returned a PaymentIntent without a client secret");
    const { error: updateError } = await admin.from("bookings").update({ stripe_payment_intent_id: paymentIntent.id }).eq("id", booking.id).eq("status", "pending_payment");
    if (updateError) throw updateError;
    return { clientSecret: paymentIntent.client_secret };
  } catch (err) {
    console.error("Failed to create PaymentIntent", err);
    throw new BookingServiceError("We couldn't start payment right now. Please try again.", 502, "payment_intent_failed");
  }
}

export interface CancelBookingParams { bookingId: string; userId: string; reason?: string; }
export interface CancelBookingResult { booking: Tables<"bookings">; refundId: string | null; refundAmountCents: number; }
export async function cancelBooking(params: CancelBookingParams): Promise<CancelBookingResult> {
  const admin = createAdminClient();
  const { data: booking, error } = await admin.from("bookings").select("*").eq("id", params.bookingId).single();
  if (error || !booking) throw new BookingServiceError("Booking not found.", 404, "booking_not_found");
  if (booking.guest_id !== params.userId && booking.host_id !== params.userId) throw new BookingServiceError("You cannot cancel this booking.", 403, "forbidden");
  if (["cancelled", "completed", "refunded"].includes(booking.status)) throw new BookingServiceError("This booking can no longer be cancelled.", 422, "not_cancellable");

  let refundId: string | null = null;
  let refundAmountCents = 0;
  if (booking.payment_status === "paid" && booking.stripe_payment_intent_id) {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
    refundId = refund.id; refundAmountCents = refund.amount ?? booking.total_cents;
  }
  const { data: updated, error: updateError } = await admin.from("bookings").update({ status: "cancelled", payment_status: refundId ? "refunded" : booking.payment_status, cancelled_at: new Date().toISOString() }).eq("id", booking.id).select().single();
  if (updateError || !updated) throw new BookingServiceError("Failed to cancel booking.", 500, "cancel_failed");
  return { booking: updated, refundId, refundAmountCents };
}
