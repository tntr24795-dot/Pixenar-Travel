import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { quoteRequestSchema } from "@/lib/validation/schemas";
import { checkAvailability } from "@/lib/availability/checkAvailability";
import { calculateBookingQuote, type ListingPricingInput } from "@/lib/pricing/calculateBookingQuote";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/listings/[id]/quote
 *
 * Body: { checkIn, checkOut, adults, children, infants, pets } (quoteRequestSchema)
 *
 * This is THE endpoint that computes a real, server-side, charge-able price
 * for a stay -- it is also what the checkout page (owned by a different
 * agent) is expected to call. Response shape: every `BookingQuote` field
 * (see lib/pricing/calculateBookingQuote.ts) PLUS the short aliases from the
 * guideline's worked example (`subtotal`, `guestServiceFee`, `tax`, `total`),
 * so either naming works for a consumer.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const listingId = params.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { checkIn, checkOut, adults, children, infants, pets } = parsed.data;

  // NOTE: cast works around a type-inference regression between the
  // installed @supabase/ssr and @supabase/supabase-js versions in this
  // environment (see app/api/listings/route.ts for the full explanation).
  const supabase = createClient() as unknown as SupabaseClient<Database>;

  // RLS policy `listings_select_active_or_own_or_admin` (see
  // supabase/migrations/0002_rls.sql) already encodes "visible if
  // status = 'active', OR the requester owns the host_profile, OR the
  // requester is an admin". A plain select therefore 404s for anyone who
  // shouldn't see this listing without us re-deriving that check by hand.
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      "id, base_price_cents, weekend_price_cents, cleaning_fee_cents, extra_guest_fee_cents, pet_fee_cents, maximum_guests, weekly_discount_percent, monthly_discount_percent, currency, minimum_nights, maximum_nights, status"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    console.error("Failed to load listing for quote", listingError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let availability;
  try {
    availability = await checkAvailability(supabase, listingId, checkIn, checkOut);
  } catch (err) {
    console.error("Failed to check availability for quote", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  if (!availability.available) {
    return NextResponse.json(
      { available: false, reason: availability.reason ?? "unavailable" },
      { status: 409 }
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

  const quote = calculateBookingQuote(
    pricingInput,
    checkIn,
    checkOut,
    { adults, children, infants, pets },
    { customPricesByDate: availability.customPricesByDate }
  );

  if (!quote.available) {
    return NextResponse.json({ available: false, reason: quote.reason }, { status: 409 });
  }

  return NextResponse.json({
    ...quote,
    subtotal: quote.nightlySubtotalCents,
    guestServiceFee: quote.guestServiceFeeCents,
    tax: quote.taxCents,
    total: quote.totalCents,
  });
}
