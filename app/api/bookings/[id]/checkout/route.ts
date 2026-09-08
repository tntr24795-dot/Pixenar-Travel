import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { BookingServiceError, createBookingCheckout } from "@/services/booking.service";

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
    const rate = await consumeRateLimit(`booking-checkout:${user.id}`, 60, 10);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }
  } catch (err) {
    console.error("booking checkout rate limit failed", err);
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
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
