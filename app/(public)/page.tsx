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
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { PROPERTY_TYPES } from "@/constants";
import { HeroSearchBar } from "./_components/hero-search-bar";
import { HomepageHeroBackdrop } from "./_components/homepage-hero-backdrop";
import {
  FeaturedPropertiesReveal,
  type FeaturedProperty,
} from "./_components/featured-properties-reveal";
import { ScrollFadeIn } from "./_components/scroll-fade-in";

export const dynamic = "force-dynamic";

const BEDROOM_IMAGE_URL =
  "https://raw.githubusercontent.com/tntr24795-dot/Pixenar-Travel/dd5465936a5da8c8ece4bd733ba173791abf3058/public/images/home-bedroom.webp";

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

const POPULAR_DESTINATIONS = [
  { city: "New York", tagline: "Times Square lights & Broadway", imageUrl: "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?auto=format&fit=crop&w=800&q=80" },
  { city: "Los Angeles", tagline: "Hollywood & Pacific sunsets", imageUrl: "https://images.unsplash.com/photo-1520867103747-49ecade4be79?auto=format&fit=crop&w=800&q=80" },
  { city: "Chicago", tagline: "The Bean & lakefront skyline", imageUrl: "https://images.unsplash.com/photo-1597933534024-debb6104af15?auto=format&fit=crop&w=800&q=80" },
  { city: "Las Vegas", tagline: "The Strip after dark", imageUrl: "https://images.unsplash.com/photo-1742627188934-0761f6d7a8f0?auto=format&fit=crop&w=800&q=80" },
  { city: "Miami", tagline: "Art Deco & South Beach", imageUrl: "https://images.unsplash.com/photo-1752014613771-7afd0d131b9c?auto=format&fit=crop&w=800&q=80" },
  { city: "Austin", tagline: "Live music & lake days", imageUrl: "https://images.unsplash.com/photo-1557335200-a65f7f032602?auto=format&fit=crop&w=800&q=80" },
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
      .select("slug, title, city, state, base_price_cents, currency, average_rating, review_count, listing_images(public_url, is_cover, sort_order)")
      .eq("status", "active")
      .order("average_rating", { ascending: false })
      .limit(8)
      .returns<RawFeaturedListingRow[]>();

    if (error) {
      console.error("[home] failed to load featured properties:", error.message);
      return [];
    }

    return (data ?? []).map((listing) => {
      const images = listing.listing_images ?? [];
      const cover = images.find((image) => image.is_cover) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
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
      <section id="hero" className="relative flex min-h-[680px] w-full items-center justify-center bg-havena-teal md:min-h-[calc(100vh-4.5rem)]">
        <HomepageHeroBackdrop />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(11,14,20,.72),rgba(11,14,20,.30)_55%,rgba(11,14,20,.55))]" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 text-left">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">Curated homes · Transparent pricing · Trusted hosts</p>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tight text-white drop-shadow-lg sm:text-6xl md:text-7xl">Stay somewhere<br />worth remembering.</h1>
            <p className="max-w-xl text-balance text-base font-medium leading-relaxed text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.75)] sm:text-lg">Discover character-filled homes and thoughtful hosts for your next escape.</p>
          </div>
          <HeroSearchBar />
        </div>
      </section>

      <section aria-label="Browse by property type" className="border-b border-border/70 bg-background py-10">
        <div className="container">
          <div className="flex gap-6 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible md:grid-cols-9">
            {PROPERTY_TYPES.map((type) => {
              const Icon = PROPERTY_TYPE_ICONS[type.value] ?? HomeIcon;
              return (
                <Link key={type.value} href={`/search?propertyType=${type.value}`} className="group flex shrink-0 flex-col items-center gap-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{type.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="destinations" className="bg-secondary/55 py-20">
        <div className="container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">Featured stays</h2>
              <p className="mt-2 text-base text-muted-foreground">Highly rated places our guests keep coming back to.</p>
            </div>
            <Button asChild variant="secondary" className="hidden sm:inline-flex"><Link href="/search">Explore all stays</Link></Button>
          </div>
          <FeaturedPropertiesReveal properties={featuredProperties} />
        </div>
      </section>

      <section aria-label="Popular destinations" className="bg-background py-20">
        <div className="container">
          <h2 className="mb-8 font-display text-3xl font-semibold text-foreground sm:text-4xl">Popular destinations</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {POPULAR_DESTINATIONS.map((destination) => (
              <Link key={destination.city} href={`/search?location=${encodeURIComponent(destination.city)}`} className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl text-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg">
                <Image src={destination.imageUrl} alt={destination.city} fill sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="relative z-10 p-4 font-display text-lg font-semibold drop-shadow">{destination.city}</span>
                <span className="relative z-10 px-4 pb-4 text-xs text-white/85">{destination.tagline}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden bg-havena-teal bg-cover bg-center text-white" style={{ backgroundImage: `url(${BEDROOM_IMAGE_URL})` }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,184,90,.28),transparent_42%),linear-gradient(135deg,rgba(11,14,20,.18),rgba(11,14,20,.52))]" />
        <section id="cta" className="relative py-24">
          <div className="container relative z-10">
            <ScrollFadeIn className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <h2 className="font-display text-3xl font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] sm:text-4xl">Have a place worth sharing?</h2>
              <p className="font-medium leading-relaxed text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">List your property on Pixenar Travel and reach travelers looking for something better than a hotel room. Setting up takes minutes -- pricing, calendar, and payouts are all handled for you.</p>
              <Button asChild size="lg" variant="secondary"><Link href="/become-a-host">Become a host</Link></Button>
            </ScrollFadeIn>
          </div>
        </section>
        <Footer embedded />
      </div>
    </>
  );
}
