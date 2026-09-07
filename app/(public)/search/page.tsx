import Link from "next/link";
import Image from "next/image";
import { MapIcon } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { searchListings } from "@/lib/listings/searchListings";
import { geocodeAddress } from "@/lib/mapbox/geocode";
import type { Database } from "@/types/database";
import { SearchBar } from "@/components/search/search-bar";
import { Filters } from "@/components/search/filters";
import { ListingsMap, type MapPin } from "@/components/search/listings-map";
import { ListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SortSelect } from "./sort-select";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

interface SearchPageProps {
  searchParams: Record<string, SearchParamValue>;
}

const SIMPLE_KEYS = [
  "location",
  "checkIn",
  "checkOut",
  "adults",
  "children",
  "infants",
  "pets",
  "minPrice",
  "maxPrice",
  "propertyType",
  "roomType",
  "bedrooms",
  "beds",
  "bathrooms",
  "instantBook",
  "sort",
] as const;

function toSingle(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSearchParams(searchParams: SearchPageProps["searchParams"]): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of SIMPLE_KEYS) {
    const value = toSingle(searchParams[key]);
    if (value !== undefined && value !== "") raw[key] = value;
  }
  const amenitiesRaw = searchParams.amenities;
  const amenities = Array.isArray(amenitiesRaw) ? amenitiesRaw : amenitiesRaw ? [amenitiesRaw] : [];
  if (amenities.length > 0) raw.amenities = amenities;
  return raw;
}

/** Builds a `/search?...` href preserving every current param except `page`. */
function pageHref(searchParams: SearchPageProps["searchParams"], targetPage: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  params.set("page", String(targetPage));
  return `/search?${params.toString()}`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const parsed = searchQuerySchema.safeParse(parseSearchParams(searchParams));
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});

  const page = Number(toSingle(searchParams.page) ?? 1) || 1;
  const pageSize = 20;

  // NOTE: cast works around a type-inference regression between the
  // installed @supabase/ssr and @supabase/supabase-js versions in this
  // environment (see app/api/listings/route.ts for the full explanation).
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  let searchUnavailable = false;
  const result = await searchListings(supabase, { ...query, page, pageSize }).catch((error) => {
    searchUnavailable = true;
    console.error("[search page] failed to load listings:", error);
    return {
      listings: [],
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  });

  // Center the map on the destination the traveler chose, even when that
  // destination does not have a published listing yet. Mapbox caches this
  // lookup server-side, so repeat searches do not add unnecessary latency.
  const selectedDestination = query.location
    ? await geocodeAddress(query.location).catch((error) => {
        console.error("[search page] failed to locate destination:", error);
        return null;
      })
    : null;

  const pins: MapPin[] = result.listings.flatMap((listing) =>
    listing.latitude != null && listing.longitude != null
      ? [
          {
            id: listing.id,
            slug: listing.slug,
            latitude: listing.latitude,
            longitude: listing.longitude,
            priceCents: listing.nightlyPriceCents,
            currency: listing.currency,
          },
        ]
      : []
  );

  return (
    <div>
      <div className="relative h-[22vh] min-h-[190px] w-full overflow-hidden bg-havena-ink">
        <Image
          src="/images/search-hero.webp"
          alt="A sunlit coastal villa terrace overlooking the sea"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-havena-ink/75 to-transparent" />
        <div className="container relative flex h-full items-center">
          <div className="max-w-xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-havena-gold">Find your place</p>
            <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Stays made for the way you travel</h1>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-background/95 py-4">
        <div className="container">
          <SearchBar />
        </div>
      </div>

      <div className="container py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {result.total} stay{result.total === 1 ? "" : "s"} found
          </p>
          <div className="flex items-center gap-2">
            <SortSelect />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                  <MapIcon className="h-4 w-4" />
                  Show map
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[100dvh] w-full max-w-none p-0">
                <SheetHeader className="p-4">
                  <SheetTitle>Map</SheetTitle>
                </SheetHeader>
                <ListingsMap
                  pins={pins}
                  centerLat={selectedDestination?.latitude}
                  centerLng={selectedDestination?.longitude}
                  zoom={selectedDestination ? 10 : 11}
                  className="h-[calc(100dvh-64px)] w-full rounded-none"
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr_1fr]">
          <aside>
            <Filters />
          </aside>

          <section>
            {result.listings.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                  <MapIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="font-display text-xl font-semibold">
                  {searchUnavailable ? "Search is temporarily unavailable" : "No stays match your search"}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {searchUnavailable
                    ? "We couldn't load stays just now. Please refresh the page in a moment."
                    : "Try widening your dates, price range, or removing a filter."}
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/search">{searchUnavailable ? "Try again" : "Clear all filters"}</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {result.listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      slug={listing.slug}
                      title={listing.title}
                      city={listing.city}
                      state={listing.state}
                      nightlyPriceCents={listing.nightlyPriceCents}
                      currency={listing.currency}
                      averageRating={listing.averageRating}
                      reviewCount={listing.reviewCount}
                      instantBook={listing.instantBook}
                      coverImage={listing.coverImage}
                    />
                  ))}
                </div>

                {result.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Link
                      href={pageHref(searchParams, Math.max(1, page - 1))}
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                      aria-disabled={page <= 1}
                    >
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      Page {result.page} of {result.totalPages}
                    </span>
                    <Link
                      href={pageHref(searchParams, Math.min(result.totalPages, page + 1))}
                      className={page >= result.totalPages ? "pointer-events-none opacity-40" : ""}
                      aria-disabled={page >= result.totalPages}
                    >
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <ListingsMap
                pins={pins}
                centerLat={selectedDestination?.latitude}
                centerLng={selectedDestination?.longitude}
                zoom={selectedDestination ? 10 : 11}
                className="h-full w-full rounded-2xl"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
