import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createHoldSchema } from "@/lib/validation/schemas";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { BookingServiceError, createBookingHold } from "@/services/booking.service";

/**
 * POST /api/bookings/hold
 *
 * Creates a 15-minute booking hold for the signed-in guest. Thin wrapper:
 * authenticate, validate input shape, delegate all pricing/authorization/
 * double-booking logic to services/booking.service.ts.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rate = await consumeRateLimit(`booking-hold:${user.id}`, 60, 8);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }
  } catch (err) {
    console.error("booking hold rate limit failed", err);
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createHoldSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { booking, priceItems } = await createBookingHold({
      listingId: parsed.data.listingId,
      guestId: user.id,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      infants: parsed.data.infants,
      pets: parsed.data.pets,
    });
    return NextResponse.json({ booking, priceItems }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("createBookingHold failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
