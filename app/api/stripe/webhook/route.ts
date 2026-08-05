import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { verifyWebhookSignature } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmBooking } from "@/services/booking.service";
import type { Database, Json } from "@/types/database";

/**
 * POST /api/stripe/webhook
 *
 * CRITICAL PATH — this is the only place a payment ever actually confirms a
 * booking. Two hard requirements:
 *
 *   1. Signature verification: we read the RAW body via `request.text()`
 *      (never `request.json()` — Stripe's signature check needs the exact
 *      bytes Stripe signed) and verify it with `verifyWebhookSignature()`
 *      before trusting anything in the payload.
 *   2. Idempotency: Stripe can and will redeliver the same event. We check
 *      `payment_events` (keyed by the unique `stripe_event_id`) BEFORE
 *      acting, insert a `pending` row first, only then handle the event,
 *      then flip that row to `processed`/`failed`. A redelivery of an
 *      already-`processed` event returns 200 immediately without doing
 *      anything twice (e.g. without double-confirming a booking or
 *      double-inserting a dispute row).
 *
 * We always return 200 once the event has been durably recorded in
 * `payment_events` — including for event types we don't fully act on —
 * so Stripe doesn't retry forever. Genuine handler failures are recorded
 * with `processing_status: 'failed'` for admin follow-up rather than
 * silently swallowed.
 *
 * We never trust the payload for anything other than "which booking/account
 * to look up" — amounts, statuses etc. are always re-derived from our own
 * DB (e.g. confirmBooking() does not re-set total_cents from the webhook).
 */
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
    // Already handled a previous delivery of this exact event — idempotent no-op.
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
      // Most likely a race with a concurrent delivery of the same event
      // hitting the unique `stripe_event_id` constraint — safe to ack and
      // let whichever request won the race handle it.
      console.error("Failed to record payment_event", insertError);
      return NextResponse.json({ received: true });
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
    // Still 200: we've durably recorded the event, and retrying won't help
    // if the failure was e.g. a genuine state conflict — it just needs a
    // human. `payment_events.processing_status = 'failed'` rows should be
    // monitored by an admin/ops process.
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

async function handleEvent(event: Stripe.Event, admin: SupabaseClient<Database>): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.booking_id;
      if (!bookingId) {
        console.warn("payment_intent.succeeded with no booking_id metadata", pi.id);
        break;
      }
      const chargeId =
        typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;

      const booking = await confirmBooking(bookingId, pi.id, chargeId);

      const { error: availabilityError } = await admin
        .from("availability")
        .update({ status: "booked", booking_id: booking.id })
        .eq("listing_id", booking.listing_id)
        .gte("date", booking.check_in)
        .lt("date", booking.check_out);
      if (availabilityError) {
        console.error(
          `Failed to flip availability rows to 'booked' for booking ${booking.id}`,
          availabilityError
        );
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.booking_id;
      if (!bookingId) break;

      await admin.from("bookings").update({ payment_status: "failed" }).eq("id", bookingId);
      // Deliberately do NOT touch `status` here — it stays 'pending_payment'
      // so the guest can retry within their hold window, or
      // expireStaleHolds() frees the dates naturally once hold_expires_at
      // passes. Freeing the dates immediately on a failed charge would let
      // someone else grab them while this guest might still retry.
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
      await admin
        .from("bookings")
        .update({
          payment_status: fullyRefunded ? "refunded" : "partially_refunded",
        })
        .eq("id", bookingId);
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
        // Disputes are filed by the cardholder with their bank, not through
        // our app — attribute to the guest, the closest match to "opened_by".
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
        console.error(`Failed to sync host_profiles for Stripe account ${account.id}`, error);
      }
      break;
    }

    case "payout.paid":
    case "payout.failed": {
      // No dedicated payouts table in the current schema — the raw event is
      // already durably recorded in payment_events above for admin
      // visibility/reconciliation. Nothing further to do here today.
      break;
    }

    default:
      // Unhandled event type — still acknowledged + durably recorded above.
      break;
  }
}
