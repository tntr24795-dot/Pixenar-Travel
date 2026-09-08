import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { BookingServiceError, createBookingCheckout } from "@/services/booking.service";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rate = await consumeRateLimit(`payment-intent:${user.id}`, 60, 10);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }
  } catch (err) {
    console.error("payment intent rate limit failed", err);
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : null;
  if (!bookingId) {
    return NextResponse.json(
      { error: "invalid_input", detail: "bookingId is required" },
      { status: 400 }
    );
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
