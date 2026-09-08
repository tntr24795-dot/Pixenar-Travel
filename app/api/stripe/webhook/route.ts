import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripe, verifyWebhookSignature } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json, Tables } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingEvent } = await admin
    .from("payment_events")
    .select("id, processing_status")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent?.processing_status === "processed") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  let eventRowId = existingEvent?.id;
  if (!eventRowId) {
    const { data: inserted, error: insertError } = await admin
      .from("payment_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        booking_id: extractBookingId(event),
        payload: JSON.parse(JSON.stringify(event)) as Json,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("Failed to record payment_event", insertError);
      return NextResponse.json({ error: "event_persistence_failed" }, { status: 500 });
    }
    eventRowId = inserted.id;
  }

  try {
    await handleEvent(event, admin);
    await admin
      .from("payment_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("id", eventRowId);
  } catch (err) {
    console.error(`[NEEDS REVIEW] Failed to handle Stripe event ${event.id} (${event.type})`, err);
    await admin
      .from("payment_events")
      .update({ processing_status: "failed", processed_at: new Date().toISOString() })
      .eq("id", eventRowId);

    return NextResponse.json({ error: "event_processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function extractBookingId(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: Record<string, string> };
  return obj?.metadata?.booking_id ?? null;
}

async function findBookingIdByPaymentIntent(
  admin: SupabaseClient<Database>,
  paymentIntent: string | Stripe.PaymentIntent | null | undefined
): Promise<string | null> {
  const piId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!piId) return null;
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  return data?.id ?? null;
}

async function refundLatePayment(
  admin: SupabaseClient<Database>,
  booking: Tables<"bookings">,
  paymentIntentId: string
): Promise<void> {
  if (booking.stripe_payment_intent_id !== paymentIntentId) {
    throw new Error(
      `PaymentIntent ${paymentIntentId} does not match booking ${booking.id}; refusing automatic refund.`
    );
  }

  const stripe = getStripe();
  await stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `late-payment-refund:${booking.id}:${paymentIntentId}` }
  );

  const { error } = await admin
    .from("bookings")
    .update({
      status: "refunded",
      payment_status: "refunded",
      cancelled_at: booking.cancelled_at ?? new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    throw new Error(`Late-payment refund succeeded but booking update failed: ${error.message}`);
  }
}

/**
 * Confirm exactly one booking and make retries safe. A webhook can be
 * delivered more than once, and a first attempt can confirm the booking but
 * fail later while updating availability. In that case a retry must be able
 * to resume instead of treating the already-confirmed booking as a conflict.
 */
async function confirmExactBooking(
  admin: SupabaseClient<Database>,
  bookingId: string,
  stripePaymentIntentId: string,
  stripeChargeId?: string | null
): Promise<Tables<"bookings">> {
  const { data, error } = await admin
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_charge_id: stripeChargeId ?? null,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select()
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  const { data: existing, error: existingError } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !existingError &&
    existing &&
    existing.status === "confirmed" &&
    existing.payment_status === "paid" &&
    existing.stripe_payment_intent_id === stripePaymentIntentId
  ) {
    return existing;
  }

  throw new Error(
    `Could not confirm booking ${bookingId} after successful payment; booking is no longer pending payment.`
  );
}

async function handleEvent(event: Stripe.Event, admin: SupabaseClient<Database>): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.booking_id;
      if (!bookingId) {
        console.warn("payment_intent.succeeded with no booking_id metadata", pi.id);
        break;
      }

      const { data: existingBooking, error: bookingLookupError } = await admin
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (bookingLookupError || !existingBooking) {
        throw new Error(`Successful PaymentIntent ${pi.id} references missing booking ${bookingId}.`);
      }

      // A client can still finish Stripe confirmation milliseconds after the
      // 15-minute hold expires. Never leave that guest charged without a stay:
      // expired/cancelled bookings are refunded immediately and idempotently.
      if (existingBooking.status === "expired" || existingBooking.status === "cancelled") {
        await refundLatePayment(admin, existingBooking, pi.id);
        break;
      }

      const chargeId =
        typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
      const booking = await confirmExactBooking(admin, bookingId, pi.id, chargeId);

      const { error: availabilityError } = await admin
        .from("availability")
        .update({ status: "booked", booking_id: booking.id })
        .eq("listing_id", booking.listing_id)
        .gte("date", booking.check_in)
        .lt("date", booking.check_out);
      if (availabilityError) {
        throw new Error(
          `Failed to flip availability rows to booked for booking ${booking.id}: ${availabilityError.message}`
        );
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.booking_id;
      if (!bookingId) break;

      const { error } = await admin
        .from("bookings")
        .update({ payment_status: "failed" })
        .eq("id", bookingId)
        .eq("stripe_payment_intent_id", pi.id);
      if (error) throw new Error(`Failed to mark payment failed for ${bookingId}: ${error.message}`);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const bookingId =
        (charge.metadata?.booking_id as string | undefined) ??
        (await findBookingIdByPaymentIntent(admin, charge.payment_intent));
      if (!bookingId) {
        console.warn("charge.refunded with no matching booking", charge.id);
        break;
      }
      const fullyRefunded = charge.amount_refunded >= charge.amount;
      const { error } = await admin
        .from("bookings")
        .update({ payment_status: fullyRefunded ? "refunded" : "partially_refunded" })
        .eq("id", bookingId);
      if (error) throw new Error(`Failed to sync refund for booking ${bookingId}: ${error.message}`);
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const bookingId = await findBookingIdByPaymentIntent(admin, dispute.payment_intent);
      if (!bookingId) {
        console.warn("charge.dispute.created with no matching booking", dispute.id);
        break;
      }
      const { data: bookingRow } = await admin
        .from("bookings")
        .select("guest_id")
        .eq("id", bookingId)
        .single();
      if (!bookingRow) break;

      await admin.from("disputes").insert({
        booking_id: bookingId,
        opened_by: bookingRow.guest_id,
        reason: dispute.reason ?? "unrecognized",
        description: `Stripe dispute ${dispute.id}${dispute.reason ? `: ${dispute.reason}` : ""}`,
        status: "open",
      });
      await admin.from("bookings").update({ status: "disputed" }).eq("id", bookingId);
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const { error } = await admin
        .from("host_profiles")
        .update({
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
          stripe_onboarding_complete: Boolean(account.details_submitted),
        })
        .eq("stripe_account_id", account.id);
      if (error) {
        throw new Error(`Failed to sync host profile for Stripe account ${account.id}: ${error.message}`);
      }
      break;
    }

    case "payout.paid":
    case "payout.failed":
      break;

    default:
      break;
  }
}
