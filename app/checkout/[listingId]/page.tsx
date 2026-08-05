import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/booking/checkout-form";
import type { Database } from "@/types/database";

interface CheckoutPageProps {
  params: { listingId: string };
  searchParams: {
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
    pets?: string;
  };
}

function parseGuestCount(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

/**
 * Server Component shell for the checkout flow. Reads the exact query-param
 * shape the listing-detail page's pricing card links to (checkIn, checkOut,
 * adults, children, infants, pets) and hands them to the Client Component
 * that actually drives the hold → payment state machine.
 *
 * Auth is enforced by middleware.ts (see the `/checkout` prefix added
 * there) — by the time this renders, `middleware` has already redirected
 * signed-out visitors to /login?redirect=/checkout/[listingId]?....
 */
export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { checkIn, checkOut } = searchParams;
  const adults = parseGuestCount(searchParams.adults, 1) || 1;
  const children = parseGuestCount(searchParams.children, 0);
  const infants = parseGuestCount(searchParams.infants, 0);
  const pets = parseGuestCount(searchParams.pets, 0);

  if (!checkIn || !checkOut) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-brand-ink">
          Missing dates
        </h1>
        <p className="mt-3 text-muted-foreground">
          We couldn&apos;t find check-in and check-out dates for this booking. Please go back to
          the listing and pick your dates again.
        </p>
      </div>
    );
  }

  // Only used to show a friendly title/location above the form — the price
  // itself is never derived here. It always comes from the booking hold
  // response, which is computed server-side by calculateBookingQuote().
  // Type-only cast to work around a pre-existing @supabase/ssr vs
  // @supabase/supabase-js version mismatch in this environment (see the
  // matching comment in app/api/stripe/connect/onboarding/route.ts).
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, title, city, state")
    .eq("id", params.listingId)
    .maybeSingle();

  if (!listing) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-brand-ink">Confirm and pay</h1>
      <p className="mt-1 text-muted-foreground">
        {listing.title}
        {listing.city ? ` · ${listing.city}${listing.state ? `, ${listing.state}` : ""}` : null}
      </p>

      <div className="mt-8">
        <CheckoutForm
          listingId={listing.id}
          listingSlug={listing.slug}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          infants={infants}
          pets={pets}
        />
      </div>
    </div>
  );
}
