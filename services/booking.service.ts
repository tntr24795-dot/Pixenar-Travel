/**
 * Pixenar Travel booking domain service — plain server-side TypeScript, no
 * "use client". This is the ONLY place bookings are created, confirmed,
 * cancelled or expired. Route handlers under `app/api/**` are thin wrappers
 * around these functions: they authenticate the caller, then delegate here.
 *
 * Every function in this file uses the service-role admin client
 * (`createAdminClient()`), which bypasses Row Level Security. That is safe
 * ONLY because:
 *   1. Callers of these functions have already authenticated + authorized
 *      the request themselves (see the route handlers), and
 *   2. Every price/status/payout value written here is computed fresh from
 *      the database via `calculateBookingQuote()` — never trusted from a
 *      caller-supplied number.
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

/**
 * Thrown by every function in this file for any expected failure mode
 * (not-found, forbidden, conflict, validation, upstream Stripe failure...).
 * Route handlers catch this and map `.status` straight onto the HTTP
 * response, and `.code` onto a machine-readable error code in the body.
 */
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

// ===========================================================================
// createBookingHold
// ===========================================================================

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

export async function createBookingHold(
  params: CreateBookingHoldParams
): Promise<CreateBookingHoldResult> {
  const admin = createAdminClient();

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("*")
    .eq("id", params.listingId)
    .single();
  if (listingError || !listing) {
    throw new BookingServiceError("Listing not found.", 404, "listing_not_found");
  }
  if (listing.status !== "active") {
    throw new BookingServiceError(
      "This listing isn't currently bookable.",
      422,
      "listing_not_active"
    );
  }

  // bookings.host_id references profiles(id) (the host's user id), while
  // listings.host_id references host_profiles(id) — translate between them.
  const { data: hostProfile, error: hostProfileError } = await admin
    .from("host_profiles")
    .select("user_id")
    .eq("id", listing.host_id)
    .single();
  if (hostProfileError || !hostProfile) {
    throw new BookingServiceError("Host profile not found.", 404, "host_profile_not_found");
  }

  // ---------------------------------------------------------------------
  // Fast UX pre-check ONLY. See checkAvailability()'s own doc comment: this
  // lets us return a friendly "these dates aren't available" error in the
  // common case, without even attempting a write. It is explicitly NOT the
  // guarantee against double-booking — two concurrent requests for the same
  // listing/dates can both pass this check at the same instant. The actual,
  // authoritative defense is the `no_overlapping_bookings` EXCLUDE
  // constraint on the `bookings` table itself (see the insert below and
  // supabase/migrations/0001_schema.sql).
  // ---------------------------------------------------------------------
  const availabilityCheck = await checkAvailability(
    admin,
    params.listingId,
    params.checkIn,
    params.checkOut
  );
  if (!availabilityCheck.available) {
    throw new BookingServiceError(
      "Those dates aren't available.",
      409,
      availabilityCheck.reason ?? "unavailable"
    );
  }

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
  const guests: GuestCounts = {
    adults: params.adults,
    children: params.children,
    infants: params.infants,
    pets: params.pets,
  };

  // Never trust a price from the caller — the quote is always recomputed
  // here from data freshly loaded from the database.
  const quote = calculateBookingQuote(pricingInput, params.checkIn, params.checkOut, guests, {
    customPricesByDate: availabilityCheck.customPricesByDate,
  });
  if (!quote.available) {
    throw new BookingServiceError(
      `These dates aren't bookable (${quote.reason}).`,
      422,
      quote.reason
    );
  }

  const holdExpiresAt = new Date(Date.now() + BOOKING_HOLD_MINUTES * 60_000).toISOString();

  const bookingInsert: TablesInsert<"bookings"> = {
    booking_number: generateBookingNumber(),
    listing_id: params.listingId,
    guest_id: params.guestId,
    host_id: hostProfile.user_id,
    check_in: params.checkIn,
    check_out: params.checkOut,
    number_of_nights: quote.nights,
    adults: params.adults,
    children: params.children,
    infants: params.infants,
    pets: params.pets,
    nightly_subtotal_cents: quote.nightlySubtotalCents,
    cleaning_fee_cents: quote.cleaningFeeCents,
    guest_service_fee_cents: quote.guestServiceFeeCents,
    host_service_fee_cents: quote.hostCommissionCents,
    pet_fee_cents: quote.petFeeCents,
    tax_cents: quote.taxCents,
    discount_cents: quote.discountCents,
    total_cents: quote.totalCents,
    host_payout_cents: quote.hostPayoutCents,
    currency: quote.currency,
    status: "pending_payment",
    payment_status: "unpaid",
    hold_expires_at: holdExpiresAt,
  };

  // ---------------------------------------------------------------------
  // THE REAL double-booking guard. `bookings` carries a Postgres
  // `EXCLUDE USING gist (listing_id WITH =, stay WITH &&) WHERE (status IN
  // ('pending_payment','confirmed'))` constraint named `no_overlapping_bookings`
  // (see supabase/migrations/0001_schema.sql). If another request wins a
  // race and inserts an overlapping stay for this listing first, Postgres
  // itself rejects THIS insert with SQLSTATE 23P01 ("exclusion_violation").
  // We catch that specific code below and turn it into a clean, expected
  // error instead of a raw DB error leaking to the guest. The
  // `checkAvailability()` call above is only a nicety to avoid the round
  // trip in the common case — this insert is the actual source of truth.
  // ---------------------------------------------------------------------
  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert(bookingInsert)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23P01") {
      throw new BookingServiceError(
        "Those dates were just booked by someone else. Please pick different dates.",
        409,
        "dates_just_booked"
      );
    }
    throw new BookingServiceError(
      `Failed to create booking: ${insertError.message}`,
      500,
      "booking_insert_failed"
    );
  }
  if (!booking) {
    throw new BookingServiceError("Failed to create booking.", 500, "booking_insert_failed");
  }

  // Never store just a total — one row per quote line item, always.
  const priceItemsInsert: TablesInsert<"booking_price_items">[] = quote.items.map((item) => ({
    booking_id: booking.id,
    item_type: item.itemType,
    description: item.description,
    quantity: item.quantity,
    unit_amount_cents: item.unitAmountCents,
    total_amount_cents: item.totalAmountCents,
  }));

  const { data: priceItems, error: priceItemsError } = await admin
    .from("booking_price_items")
    .insert(priceItemsInsert)
    .select();

  if (priceItemsError) {
    // Don't leave a booking behind with no itemized breakdown — roll it
    // back rather than silently degrading to "just a total".
    await admin.from("bookings").delete().eq("id", booking.id);
    throw new BookingServiceError(
      "Failed to record the price breakdown for this booking.",
      500,
      "price_items_insert_failed"
    );
  }

  return { booking, priceItems: priceItems ?? [] };
}

// ===========================================================================
// expireStaleHolds
// ===========================================================================

export interface ExpireStaleHoldsResult {
  expiredCount: number;
  expiredBookingIds: string[];
}

/**
 * Flips any `pending_payment` booking whose hold has lapsed to `expired`,
 * freeing its dates (the `no_overlapping_bookings` constraint only applies
 * to `pending_payment` / `confirmed` rows, so an `expired` row no longer
 * blocks new bookings for the same dates).
 *
 * This environment has no persistent background worker, so this must be
 * invoked by an external scheduler — see app/api/cron/expire-holds/route.ts,
 * which should be hit by Vercel Cron (or any other scheduler) every 1-5
 * minutes given BOOKING_HOLD_MINUTES = 15.
 */
export async function expireStaleHolds(): Promise<ExpireStaleHoldsResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("bookings")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lt("hold_expires_at", nowIso)
    .select("id");

  if (error) {
    throw new BookingServiceError(
      `Failed to expire stale holds: ${error.message}`,
      500,
      "expire_holds_failed"
    );
  }

  const expiredBookingIds = (data ?? []).map((row) => row.id);
  return { expiredCount: expiredBookingIds.length, expiredBookingIds };
}

// ===========================================================================
// confirmBooking — called ONLY from the Stripe webhook handler.
// ===========================================================================

export async function confirmBooking(
  bookingId: string,
  stripePaymentIntentId: string,
  stripeChargeId?: string | null
): Promise<Tables<"bookings">> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_charge_id: stripeChargeId ?? null,
    })
    // Guard: only a still-held booking may transition to confirmed. If the
    // hold already expired (or the booking was cancelled) between the
    // PaymentIntent being created and this webhook firing, forcing it back
    // to 'confirmed' here could resurrect a booking whose dates may have
    // already been re-booked by someone else once this row turned
    // 'expired' — i.e. it would silently create a second overlapping
    // confirmed booking, exactly the thing `no_overlapping_bookings` exists
    // to prevent. Refuse instead and surface it for manual reconciliation
    // (the guest has already been charged and needs a refund or a manual
    // rebooking, not a silently-conflicting row).
    .eq("status", "pending_payment")
    .select()
    .single();

  if (error || !data) {
    throw new BookingServiceError(
      `Could not confirm booking ${bookingId} after a successful payment — its hold may have ` +
        `already expired or it was cancelled before this webhook arrived. The guest HAS been ` +
        `charged; this needs manual reconciliation (refund and/or rebook).`,
      409,
      "confirm_conflict"
    );
  }

  return data;
}

// ===========================================================================
// createBookingCheckout — shared by both
// app/api/bookings/[id]/checkout/route.ts and
// app/api/stripe/create-payment-intent/route.ts (same operation, one impl).
// ===========================================================================

export interface CreateBookingCheckoutParams {
  bookingId: string;
  guestId: string;
}

export interface CreateBookingCheckoutResult {
  clientSecret: string;
}

export async function createBookingCheckout(
  params: CreateBookingCheckoutParams
): Promise<CreateBookingCheckoutResult> {
  const admin = createAdminClient();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .single();
  if (bookingError || !booking) {
    throw new BookingServiceError("Booking not found.", 404, "booking_not_found");
  }
  if (booking.guest_id !== params.guestId) {
    throw new BookingServiceError("This booking doesn't belong to you.", 403, "forbidden");
  }
  if (booking.status !== "pending_payment") {
    throw new BookingServiceError(
      "This booking is no longer awaiting payment.",
      410,
      "booking_not_pending_payment"
    );
  }
  if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() < Date.now()) {
    throw new BookingServiceError(
      "Your hold on these dates has expired. Please start a new booking.",
      410,
      "hold_expired"
    );
  }

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", booking.listing_id)
    .single();
  if (listingError || !listing) {
    throw new BookingServiceError("Listing not found.", 404, "listing_not_found");
  }

  const { data: hostProfile, error: hostProfileError } = await admin
    .from("host_profiles")
    .select("stripe_account_id, charges_enabled")
    .eq("id", listing.host_id)
    .single();
  if (
    hostProfileError ||
    !hostProfile?.stripe_account_id ||
    !hostProfile.charges_enabled
  ) {
    throw new BookingServiceError(
      "This host isn't ready to accept payments yet. Please try again later.",
      422,
      "host_not_ready_for_payments"
    );
  }

  const stripe = getStripe();

  // If a PaymentIntent already exists for this booking (e.g. the guest's
  // first attempt failed and they're retrying within their hold window),
  // reuse it instead of creating a duplicate.
  if (booking.stripe_payment_intent_id) {
    try {
      const existing = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (
        existing.client_secret &&
        (existing.status === "requires_payment_method" ||
          existing.status === "requires_confirmation" ||
          existing.status === "requires_action")
      ) {
        return { clientSecret: existing.client_secret };
      }
    } catch {
      // Fall through and create a fresh PaymentIntent.
    }
  }

  // IMPORTANT: totalCents/hostPayoutCents/currency come from the booking
  // row itself — already server-computed at hold-creation time. Never
  // recompute or accept new numbers from this route's caller.
  const paymentIntent = await createBookingPaymentIntent({
    totalCents: booking.total_cents,
    currency: booking.currency,
    hostStripeAccountId: hostProfile.stripe_account_id,
    hostPayoutCents: booking.host_payout_cents,
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
  });

  if (!paymentIntent.client_secret) {
    throw new BookingServiceError(
      "Stripe did not return a client secret for this PaymentIntent.",
      500,
      "stripe_client_secret_missing"
    );
  }

  const { error: updateError } = await admin
    .from("bookings")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", booking.id);
  if (updateError) {
    throw new BookingServiceError(
      "Failed to store the PaymentIntent on this booking.",
      500,
      "payment_intent_store_failed"
    );
  }

  return { clientSecret: paymentIntent.client_secret };
}

// ===========================================================================
// cancelBooking
// ===========================================================================

export interface CancelBookingParams {
  bookingId: string;
  cancelledBy: string;
  reason?: string | null;
}

export interface CancelBookingResult {
  cancellation: Tables<"cancellations">;
  refund: Stripe.Refund | null;
}

export async function cancelBooking(
  params: CancelBookingParams
): Promise<CancelBookingResult> {
  const admin = createAdminClient();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .single();
  if (bookingError || !booking) {
    throw new BookingServiceError("Booking not found.", 404, "booking_not_found");
  }
  if (booking.status === "cancelled" || booking.status === "refunded") {
    throw new BookingServiceError("This booking is already cancelled.", 409, "already_cancelled");
  }

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("cancellation_policy")
    .eq("id", booking.listing_id)
    .single();
  if (listingError || !listing) {
    throw new BookingServiceError("Listing not found.", 404, "listing_not_found");
  }

  // -------------------------------------------------------------------
  // SIMPLIFIED REFUND MODEL — THIS NEEDS REAL LEGAL REVIEW BEFORE LAUNCH.
  // The client's own spec calls this out explicitly. These three flat
  // hours-until-check-in rules are a placeholder for a real cancellation
  // engine that would need to account for local consumer-protection law,
  // extenuating-circumstances/force-majeure exceptions, partial-stay
  // proration for cancellations after check-in, currency/tax handling,
  // etc. Do NOT treat this as launch-ready without counsel sign-off.
  //   - flexible: full refund if cancelled >= 24h before check-in, else none.
  //   - moderate: full refund if cancelled >= 5 days before check-in, else none.
  //   - strict:   50% refund if cancelled >= 14 days before check-in, else none.
  // -------------------------------------------------------------------
  const hoursUntilCheckIn =
    (new Date(`${booking.check_in}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60);

  let refundPercent: number;
  switch (listing.cancellation_policy) {
    case "flexible":
      refundPercent = hoursUntilCheckIn >= 24 ? 100 : 0;
      break;
    case "moderate":
      refundPercent = hoursUntilCheckIn >= 5 * 24 ? 100 : 0;
      break;
    case "strict":
      refundPercent = hoursUntilCheckIn >= 14 * 24 ? 50 : 0;
      break;
    default:
      refundPercent = 0;
  }

  const guestRefundCents = Math.round(booking.total_cents * (refundPercent / 100));
  const nonRefundedCents = booking.total_cents - guestRefundCents;
  // Whatever isn't refunded to the guest is split between the host payout
  // and the retained platform fee using the same ratio as the original
  // quote, so a partial refund doesn't hand the host either a windfall or
  // nothing relative to what they were originally promised.
  const hostShareRatio =
    booking.total_cents > 0 ? booking.host_payout_cents / booking.total_cents : 0;
  const hostPayoutCents = Math.round(nonRefundedCents * hostShareRatio);
  const platformFeeRetainedCents = nonRefundedCents - hostPayoutCents;

  const { data: cancellation, error: cancellationError } = await admin
    .from("cancellations")
    .insert({
      booking_id: booking.id,
      cancelled_by: params.cancelledBy,
      reason: params.reason ?? null,
      policy_applied: listing.cancellation_policy,
      guest_refund_cents: guestRefundCents,
      host_payout_cents: hostPayoutCents,
      platform_fee_retained_cents: platformFeeRetainedCents,
      status: "pending",
    })
    .select()
    .single();
  if (cancellationError || !cancellation) {
    throw new BookingServiceError(
      "Failed to record the cancellation.",
      500,
      "cancellation_insert_failed"
    );
  }

  await admin
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id);

  // Free the dates back up for other guests. Best-effort: availability rows
  // are a UX/inventory concern, not the source of truth for double-booking
  // (that's the exclusion constraint), so we don't fail the cancellation if
  // this update has a problem — just log it.
  const { error: availabilityError } = await admin
    .from("availability")
    .update({ status: "available", booking_id: null })
    .eq("booking_id", booking.id);
  if (availabilityError) {
    console.error(
      `Failed to free availability rows for cancelled booking ${booking.id}`,
      availabilityError
    );
  }

  let refund: Stripe.Refund | null = null;
  if (booking.payment_status === "paid" && guestRefundCents > 0 && booking.stripe_payment_intent_id) {
    const stripe = getStripe();
    try {
      refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: guestRefundCents,
      });
      await admin.from("cancellations").update({ status: "processed" }).eq("id", cancellation.id);
      await admin
        .from("bookings")
        .update({
          payment_status: guestRefundCents >= booking.total_cents ? "refunded" : "partially_refunded",
        })
        .eq("id", booking.id);
    } catch (err) {
      console.error(`Stripe refund failed for booking ${booking.id}`, err);
      await admin.from("cancellations").update({ status: "failed" }).eq("id", cancellation.id);
      throw new BookingServiceError(
        "The cancellation was recorded, but issuing the refund via Stripe failed. " +
          "This needs manual follow-up.",
        502,
        "refund_failed"
      );
    }
  }

  return { cancellation, refund };
}
