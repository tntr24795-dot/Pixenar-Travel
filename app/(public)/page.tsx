import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  Building,
  Building2,
  DoorOpen,
  Home as HomeIcon,
  Hotel,
  Palmtree,
  TreePine,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhotoHero } from "@/components/hero/photo-hero";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { PROPERTY_TYPES } from "@/constants";
import { HeroSearchBar } from "./_components/hero-search-bar";
import {
  FeaturedPropertiesReveal,
  type FeaturedProperty,
} from "./_components/featured-properties-reveal";
import { ScrollFadeIn } from "./_components/scroll-fade-in";

const PROPERTY_TYPE_ICONS: Record<string, LucideIcon> = {
  house: HomeIcon,
  apartment: Building2,
  condo: Building,
  cabin: TreePine,
  villa: Palmtree,
  tiny_home: Warehouse,
  guesthouse: DoorOpen,
  hotel_room: Hotel,
  private_room: BedDouble,
};

// Real photos of each destination's most iconic, widely-photographed landmark
// (all free-to-use under the Unsplash License -- see https://unsplash.com/license).
// `images.unsplash.com` is already an allowed remote image host in next.config.mjs.
const POPULAR_DESTINATIONS = [
  {
    city: "New York",
    tagline: "Times Square lights & Broadway",
    imageUrl: "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Los Angeles",
    tagline: "Hollywood & Pacific sunsets",
    imageUrl: "https://images.unsplash.com/photo-1520867103747-49ecade4be79?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Chicago",
    tagline: "The Bean & lakefront skyline",
    imageUrl: "https://images.unsplash.com/photo-1597933534024-debb6104af15?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Las Vegas",
    tagline: "The Strip after dark",
    imageUrl: "https://images.unsplash.com/photo-1742627188934-0761f6d7a8f0?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Miami",
    tagline: "Art Deco & South Beach",
    imageUrl: "https://images.unsplash.com/photo-1752014613771-7afd0d131b9c?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Austin",
    tagline: "Live music & lake days",
    imageUrl: "https://images.unsplash.com/photo-1557335200-a65f7f032602?auto=format&fit=crop&w=800&q=80",
  },
] as const;

type RawFeaturedListingRow = Pick<
  Tables<"listings">,
  "slug" | "title" | "city" | "state" | "base_price_cents" | "currency" | "average_rating" | "review_count"
> & {
  listing_images: Pick<Tables<"listing_images">, "public_url" | "is_cover" | "sort_order">[] | null;
};

async function getFeaturedProperties(): Promise<FeaturedProperty[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("listings")
      .select(
        "slug, title, city, state, base_price_cents, currency, average_rating, review_count, listing_images(public_url, is_cover, sort_order)"
      )
      .eq("status", "active")
      .order("average_rating", { ascending: false })
      .limit(8)
      // The generated `Database["public"]["Tables"]["listings"]["Relationships"]`
      // array is empty, so postgrest-js can't infer the shape of the nested
      // `listing_images` embed on its own -- pin the known row shape explicitly
      // rather than let every field below silently widen to `never`.
      .returns<RawFeaturedListingRow[]>();

    if (error) {
      console.error("[home] failed to load featured properties:", error.message);
      return [];
    }

    return (data ?? []).map((listing) => {
      const images = listing.listing_images ?? [];
      const cover =
        images.find((image) => image.is_cover) ??
        [...images].sort((a, b) => a.sort_order - b.sort_order)[0];

      return {
        slug: listing.slug,
        title: listing.title,
        city: listing.city,
        state: listing.state,
        basePriceCents: listing.base_price_cents,
        currency: listing.currency,
        averageRating: listing.average_rating,
        reviewCount: listing.review_count,
        coverImageUrl: cover?.public_url ?? null,
      };
    });
  } catch (err) {
    console.error("[home] unexpected error loading featured properties:", err);
    return [];
  }
}

export default async function HomePage() {
  const featuredProperties = await getFeaturedProperties();

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero -- real-photo runway-to-sky background + DOM headline/search */}
      {/* ---------------------------------------------------------------- */}
      <section id="hero" className="relative flex h-screen w-full items-center justify-center overflow-hidden">
        <PhotoHero />

        {/* Gradient scrim behind the headline/search bar so text stays
            readable regardless of which part of the runway-to-sky gradient
            happens to sit behind it at any given scroll position -- white
            text + this scrim reads reliably against both the warm dawn
            tones and the blue sky tones, unlike the previous `text-black`
            headline (which depended on the old scene always being dark). */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/25" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-6 text-center">
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white drop-shadow-md sm:text-5xl md:text-6xl">
              Find your next unforgettable stay
            </h1>
            <p className="mx-auto max-w-xl text-balance text-base text-white/90 drop-shadow sm:text-lg">
              Thoughtfully curated vacation rentals across Texas -- boutique hosts, honest pricing, booked in minutes.
            </p>
          </div>

          <HeroSearchBar />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Property categories                                           */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Browse by property type" className="border-b border-border bg-background py-10">
        <div className="container">
          <div className="flex gap-6 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible md:grid-cols-9">
            {PROPERTY_TYPES.map((type) => {
              const Icon = PROPERTY_TYPE_ICONS[type.value] ?? HomeIcon;
              return (
                <Link
                  key={type.value}
                  href={`/search?propertyType=${type.value}`}
                  className="group flex shrink-0 flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-brand-ink transition-colors group-hover:bg-brand-gold/30">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    {type.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Featured properties -- "Destinations reveal" scroll beat       */}
      {/* ---------------------------------------------------------------- */}
      <section id="destinations" className="bg-background py-16">
        <div className="container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Featured stays
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Highly rated places our guests keep coming back to.
              </p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/search">Explore all stays</Link>
            </Button>
          </div>

          <FeaturedPropertiesReveal properties={featuredProperties} />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Popular destinations                                          */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Popular destinations" className="bg-secondary/40 py-16">
        <div className="container">
          <h2 className="mb-8 font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Popular destinations
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {POPULAR_DESTINATIONS.map((destination) => (
              <Link
                key={destination.city}
                href={`/search?location=${encodeURIComponent(destination.city)}`}
                className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl text-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
              >
                <Image
                  src={destination.imageUrl}
                  alt={`${destination.city}, Texas`}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Dark gradient scrim so the city name/tagline stay readable over any photo */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="relative z-10 p-4 font-display text-lg font-semibold drop-shadow">
                  {destination.city}
                </span>
                <span className="relative z-10 px-4 pb-4 text-xs text-white/85">{destination.tagline}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 5. Become a Host CTA -- "camera locks, text fades in" scroll beat */}
      {/* ---------------------------------------------------------------- */}
      <section id="cta" className="relative overflow-hidden bg-brand-ink py-24 text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/80 to-transparent" />
        <div className="container relative z-10">
          <ScrollFadeIn className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
            {/* Was `text-black` on a dark `bg-brand-ink` section -- a
                pre-existing contrast bug independent of the dark-mode issue,
                fixed here alongside it. */}
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Have a place worth sharing?
            </h2>
            <p className="text-white/80">
              List your property on Pixenar Travel and reach travelers looking for something better than a hotel room.
              Setting up takes minutes -- pricing, calendar, and payouts are all handled for you.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/become-a-host">Become a host</Link>
            </Button>
          </ScrollFadeIn>
        </div>
      </section>
    </>
  );
}
