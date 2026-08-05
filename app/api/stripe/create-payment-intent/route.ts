import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { BookingServiceError, createBookingCheckout } from "@/services/booking.service";

/**
 * POST /api/stripe/create-payment-intent
 *
 * This is intentionally the SAME operation as
 * `POST /api/bookings/[id]/checkout` — in Pixenar Travel's domain model, "create a
 * PaymentIntent" only ever means "create the PaymentIntent for a specific
 * booking hold", with the exact same authorization/status/expiry/host-
 * readiness checks either way. Rather than maintain two implementations
 * that could drift (e.g. one recomputing amounts, one forgetting a check),
 * this route just forwards `{ bookingId }` from the JSON body into the same
 * services/booking.service.ts#createBookingCheckout used by the other
 * route. Prefer `/api/bookings/[id]/checkout` for new code — this route
 * exists for callers that expect this exact path.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : null;
  if (!bookingId) {
    return NextResponse.json({ error: "invalid_input", detail: "bookingId is required" }, { status: 400 });
  }

  try {
    const result = await createBookingCheckout({ bookingId, guestId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("createBookingCheckout failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
