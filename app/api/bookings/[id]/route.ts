import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/bookings/[id]
 *
 * Uses the session-bound `lib/supabase/server` client (NOT the admin
 * client) on purpose: the `bookings_select_participant_or_admin` RLS policy
 * already restricts visibility to the booking's guest, its host, or an
 * admin, so we don't need to hand-roll that authorization check here — an
 * unauthorized caller simply gets back no row (surfaced as 404, so we don't
 * leak whether a given booking id exists).
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: priceItems, error: priceItemsError } = await supabase
    .from("booking_price_items")
    .select("*")
    .eq("booking_id", params.id)
    .order("created_at", { ascending: true });
  if (priceItemsError) {
    return NextResponse.json({ error: "failed_to_load_price_items" }, { status: 500 });
  }

  return NextResponse.json({ booking, priceItems: priceItems ?? [] });
}
