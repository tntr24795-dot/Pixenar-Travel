import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { BookingServiceError, createBookingCheckout } from "@/services/booking.service";

/**
 * POST /api/bookings/[id]/checkout
 *
 * Creates (or reuses) the Stripe PaymentIntent for an existing booking hold
 * and returns its client secret for Stripe Elements. All authorization,
 * status/expiry checks, host-readiness checks and the actual PaymentIntent
 * creation live in services/booking.service.ts#createBookingCheckout — this
 * route only authenticates the caller and forwards their id.
 *
 * This is the same operation as POST /api/stripe/create-payment-intent —
 * see that route's comment for why there isn't a second implementation.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await createBookingCheckout({ bookingId: params.id, guestId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("createBookingCheckout failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
