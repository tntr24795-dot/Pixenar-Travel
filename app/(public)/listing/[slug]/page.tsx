import { notFound } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { PROPERTY_TYPES, ROOM_TYPES } from "@/constants";
import type { Database } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/listings/gallery";
import { ReviewsList, type ReviewItem } from "@/components/listings/reviews-list";
import { ListingsMap } from "@/components/search/listings-map";
import { PricingCard } from "@/components/booking/pricing-card";
// The full 3D-cinematic hero intro (Three.js + GSAP) is owned by a different
// agent -- see CONTEXT.md's design-language section. Assume it exists.
import HeroScene from "@/components/three/hero-scene";

export const dynamic = "force-dynamic";

interface ListingPageProps {
  params: { slug: string };
}

export default async function ListingPage({ params }: ListingPageProps) {
  // NOTE: cast works around a type-inference regression between the
  // installed @supabase/ssr and @supabase/supabase-js versions in this
  // environment (see app/api/listings/route.ts for the full explanation).
  const supabase = createClient() as unknown as SupabaseClient<Database>;

  // RLS (`listings_select_active_or_own_or_admin`, see
  // supabase/migrations/0002_rls.sql) already restricts this to active
  // listings unless the requester owns it or is an admin -- a missing row
  // here means "not found or not visible," so notFound() is correct either way.
  const { data: listing } = await supabase.from("listings").select("*").eq("slug", params.slug).maybeSingle();

  if (!listing) {
    notFound();
  }

  const [{ data: images }, { data: listingAmenityRows }, { data: hostProfile }, { data: reviewRows }] =
    await Promise.all([
      supabase
        .from("listing_images")
        .select("id, public_url, alt_text, sort_order")
        .eq("listing_id", listing.id)
        .order("sort_order", { ascending: true }),
      supabase.from("listing_amenities").select("amenity_id").eq("listing_id", listing.id),
      supabase.from("public_host_profiles").select("*").eq("id", listing.host_id).maybeSingle(),
      supabase
        .from("reviews")
        .select(
          "id, rating_overall, rating_cleanliness, rating_accuracy, rating_check_in, rating_communication, rating_location, rating_value, comment, created_at, guest_id"
        )
        .eq("listing_id", listing.id)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
    ]);

  const amenityIds = (listingAmenityRows ?? []).map((r) => r.amenity_id);
  const { data: amenityRows } = amenityIds.length
    ? await supabase.from("amenities").select("id, name, icon, category").in("id", amenityIds)
    : { data: [] as { id: string; name: string; icon: string | null; category: string }[] };

  const reviewerIds = Array.from(new Set((reviewRows ?? []).map((r) => r.guest_id)));
  const { data: reviewerProfiles } = reviewerIds.length
    ? await supabase.from("public_profiles").select("id, first_name, avatar_url").in("id", reviewerIds)
    : { data: [] as { id: string; first_name: string | null; avatar_url: string | null }[] };

  const reviewerMap = new Map((reviewerProfiles ?? []).map((p) => [p.id, p]));

  const reviews: ReviewItem[] = (reviewRows ?? []).map((r) => {
    const reviewer = reviewerMap.get(r.guest_id);
    return {
      id: r.id,
      ratingOverall: r.rating_overall,
      ratingCleanliness: r.rating_cleanliness,
      ratingAccuracy: r.rating_accuracy,
      ratingCheckIn: r.rating_check_in,
      ratingCommunication: r.rating_communication,
      ratingLocation: r.rating_location,
      ratingValue: r.rating_value,
      comment: r.comment,
      createdAt: r.created_at,
      reviewer: reviewer ? { firstName: reviewer.first_name, avatarUrl: reviewer.avatar_url } : null,
    };
  });

  const propertyTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === listing.property_type)?.label ?? listing.property_type;
  const roomTypeLabel = ROOM_TYPES.find((t) => t.value === listing.room_type)?.label ?? listing.room_type;

  // HARD REQUIREMENT (per the client's spec / CONTEXT.md rule #4): the exact
  // address is hidden from the public until a booking is confirmed. Only
  // city/state are shown here -- never render listing.address_line_1,
  // listing.address_line_2, or listing.postal_code on this page.
  const location = [listing.city, listing.state].filter(Boolean).join(", ");

  return (
    <div>
      <div className="relative h-[36vh] min-h-[260px] w-full overflow-hidden bg-havena-ink">
        <HeroScene />
      </div>

      <div className="container max-w-6xl py-8">
        <header className="mb-6 space-y-1">
          <h1 className="font-display text-3xl font-semibold">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {location || "Location shared after booking"}
            </span>
            <span>·</span>
            <span>{roomTypeLabel}</span>
            <span>·</span>
            <span>{propertyTypeLabel}</span>
            {listing.instant_book && (
              <Badge variant="outline" className="ml-1">
                Instant Book
              </Badge>
            )}
          </div>
        </header>

        <Gallery
          images={(images ?? []).map((i) => ({ id: i.id, publicUrl: i.public_url, altText: i.alt_text }))}
          title={listing.title}
        />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <p className="font-medium">
                  {roomTypeLabel} hosted by {hostProfile?.first_name ?? "a Havena host"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {listing.maximum_guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds ·{" "}
                  {listing.bathrooms} baths
                </p>
              </div>
              <Avatar className="h-14 w-14">
                <AvatarImage src={hostProfile?.avatar_url ?? undefined} alt={hostProfile?.first_name ?? "Host"} />
                <AvatarFallback>{(hostProfile?.first_name ?? "H").slice(0, 1)}</AvatarFallback>
              </Avatar>
            </section>

            {listing.description && (
              <section className="space-y-2 border-b border-border pb-6">
                <h2 className="font-display text-xl font-semibold">About this place</h2>
                <p className="whitespace-pre-line text-foreground/90">{listing.description}</p>
              </section>
            )}

            {amenityRows && amenityRows.length > 0 && (
              <section className="space-y-3 border-b border-border pb-6">
                <h2 className="font-display text-xl font-semibold">What this place offers</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {amenityRows.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" aria-hidden />
                      {a.name}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 border-b border-border pb-6">
              <h2 className="font-display text-xl font-semibold">House rules</h2>
              <ul className="space-y-1 text-sm text-foreground/90">
                <li>Check-in after {listing.check_in_time}</li>
                <li>Checkout before {listing.check_out_time}</li>
                <li>{listing.minimum_nights} night minimum stay</li>
                <li>{listing.maximum_nights} night maximum stay</li>
              </ul>
            </section>

            <section className="space-y-3 border-b border-border pb-6">
              <h2 className="font-display text-xl font-semibold">Where you&apos;ll be</h2>
              {/* Approximate area only -- exact address hidden until booking is confirmed. */}
              <p className="text-sm text-muted-foreground">{location || "Approximate location"}</p>
              {listing.latitude != null && listing.longitude != null ? (
                <ListingsMap
                  pins={[
                    {
                      id: listing.id,
                      slug: listing.slug,
                      latitude: listing.latitude,
                      longitude: listing.longitude,
                    },
                  ]}
                  centerLat={listing.latitude}
                  centerLng={listing.longitude}
                  zoom={13}
                  className="h-72 w-full rounded-2xl"
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
                  Map location not yet set
                </div>
              )}
            </section>

            <ReviewsList reviews={reviews} averageRating={listing.average_rating} reviewCount={listing.review_count} />

            <section className="flex items-center gap-4 rounded-2xl border border-border p-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={hostProfile?.avatar_url ?? undefined} alt={hostProfile?.first_name ?? "Host"} />
                <AvatarFallback>{(hostProfile?.first_name ?? "H").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Hosted by {hostProfile?.first_name ?? "a Havena host"}</p>
                <p className="text-sm text-muted-foreground">
                  {hostProfile?.identity_status === "verified" && (
                    <span className="mr-2 inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Identity verified
                    </span>
                  )}
                  {hostProfile?.average_rating ? `${hostProfile.average_rating.toFixed(1)} rating` : "New host"} ·{" "}
                  {hostProfile?.total_reviews ?? 0} reviews
                </p>
                {hostProfile?.bio && <p className="mt-2 max-w-prose text-sm text-foreground/90">{hostProfile.bio}</p>}
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <PricingCard
                listingId={listing.id}
                currency={listing.currency}
                basePriceCents={listing.base_price_cents}
                maximumGuests={listing.maximum_guests}
                minimumNights={listing.minimum_nights}
                maximumNights={listing.maximum_nights}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
