import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { BookingServiceError, cancelBooking } from "@/services/booking.service";

/**
 * POST /api/bookings/[id]/cancel
 *
 * Authorizes the caller as the booking's guest or host (or an admin) using
 * the session-bound client's read (RLS already restricts which rows are
 * even visible), then delegates the refund-split computation and Stripe
 * refund to services/booking.service.ts#cancelBooking.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS (`bookings_select_participant_or_admin`) already means this select
  // only returns a row if the caller is the guest, the host, or an admin —
  // so finding the row at all is sufficient authorization to proceed.
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", params.id)
    .single();
  if (error || !booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : null;

  try {
    const result = await cancelBooking({ bookingId: params.id, cancelledBy: user.id, reason });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("cancelBooking failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
