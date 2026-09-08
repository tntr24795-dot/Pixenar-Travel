import Link from "next/link";
import { ListFilter, MapIcon } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SortSelect } from "./sort-select";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;
interface SearchPageProps { searchParams: Record<string, SearchParamValue>; }

const SIMPLE_KEYS = ["location", "checkIn", "checkOut", "adults", "children", "infants", "pets", "minPrice", "maxPrice", "propertyType", "roomType", "bedrooms", "beds", "bathrooms", "instantBook", "sort"] as const;

function toSingle(value: SearchParamValue): string | undefined { return Array.isArray(value) ? value[0] : value; }
function parseSearchParams(searchParams: SearchPageProps["searchParams"]): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of SIMPLE_KEYS) { const value = toSingle(searchParams[key]); if (value !== undefined && value !== "") raw[key] = value; }
  const amenitiesRaw = searchParams.amenities;
  const amenities = Array.isArray(amenitiesRaw) ? amenitiesRaw : amenitiesRaw ? [amenitiesRaw] : [];
  if (amenities.length > 0) raw.amenities = amenities;
  return raw;
}
function pageHref(searchParams: SearchPageProps["searchParams"], targetPage: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) { if (key === "page" || value == null) continue; if (Array.isArray(value)) value.forEach((v) => params.append(key, v)); else params.set(key, value); }
  params.set("page", String(targetPage)); return `/search?${params.toString()}`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const parsed = searchQuerySchema.safeParse(parseSearchParams(searchParams));
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
  const page = Number(toSingle(searchParams.page) ?? 1) || 1;
  const pageSize = 20;
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  let searchUnavailable = false;
  const result = await searchListings(supabase, { ...query, page, pageSize }).catch((error) => { searchUnavailable = true; console.error("[search page] failed to load listings:", error); return { listings: [], page, pageSize, total: 0, totalPages: 1 }; });
  const selectedDestination = query.location ? await geocodeAddress(query.location).catch((error) => { console.error("[search page] failed to locate destination:", error); return null; }) : null;
  const pins: MapPin[] = result.listings.flatMap((listing) => listing.latitude != null && listing.longitude != null ? [{ id: listing.id, slug: listing.slug, latitude: listing.latitude, longitude: listing.longitude, priceCents: listing.nightlyPriceCents, currency: listing.currency }] : []);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-[4.5rem] z-30 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6"><SearchBar /></div>
      </div>
      <div className="mx-auto w-full max-w-[1880px] px-5 py-5 sm:px-7 lg:px-9 xl:px-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-display text-xl font-semibold text-foreground">{query.location ? `Stays in ${query.location}` : "Explore stays"}</p><p className="mt-0.5 text-sm text-muted-foreground">{result.total} stay{result.total === 1 ? "" : "s"} found</p></div>
          <div className="flex items-center gap-2">
            <Sheet><SheetTrigger asChild><Button variant="outline" size="sm" className="gap-2 rounded-full"><ListFilter className="h-4 w-4" />Filters</Button></SheetTrigger><SheetContent side="left" className="w-[92vw] overflow-y-auto p-0 sm:max-w-md"><SheetHeader className="border-b border-border p-5 text-left"><SheetTitle>Filters</SheetTitle></SheetHeader><div className="p-5"><Filters className="border-0 p-0 shadow-none" /></div></SheetContent></Sheet>
            <SortSelect />
            <Sheet><SheetTrigger asChild><Button variant="outline" size="sm" className="gap-2 rounded-full lg:hidden"><MapIcon className="h-4 w-4" />Map</Button></SheetTrigger><SheetContent side="bottom" className="h-[100dvh] w-full max-w-none p-0"><SheetHeader className="border-b border-border p-4"><SheetTitle>Map</SheetTitle></SheetHeader><ListingsMap pins={pins} centerLat={selectedDestination?.latitude} centerLng={selectedDestination?.longitude} zoom={selectedDestination ? 10 : 11} className="h-[calc(100dvh-65px)] w-full rounded-none border-0" /></SheetContent></Sheet>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,85fr)_minmax(210px,15fr)] lg:gap-6 xl:grid-cols-[minmax(0,88fr)_minmax(220px,12fr)] xl:gap-7">
          <aside className="hidden lg:block">
            <div className="sticky top-[9.4rem] h-[calc(100vh-10.6rem)] min-h-[640px] overflow-hidden rounded-3xl border border-border bg-muted shadow-sm">
              <ListingsMap pins={pins} centerLat={selectedDestination?.latitude} centerLng={selectedDestination?.longitude} zoom={selectedDestination ? 10 : 11} className="h-full w-full rounded-3xl border-0" />
            </div>
          </aside>

          <section className="min-w-0 pb-10">
            {result.listings.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card px-4 py-12 text-center shadow-sm"><span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary"><MapIcon className="h-6 w-6" aria-hidden="true" /></span><p className="font-display text-lg font-semibold">{searchUnavailable ? "Search is temporarily unavailable" : "No stays match your search"}</p><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{searchUnavailable ? "We couldn't load stays just now. Please refresh the page in a moment." : "Try widening your dates, price range, or removing a filter."}</p><Button asChild variant="outline" className="mt-6 rounded-full"><Link href="/search">{searchUnavailable ? "Try again" : "Clear all filters"}</Link></Button></div>
            ) : (
              <><div className="grid grid-cols-1 gap-y-7">{result.listings.map((listing) => <ListingCard key={listing.id} slug={listing.slug} title={listing.title} city={listing.city} state={listing.state} nightlyPriceCents={listing.nightlyPriceCents} currency={listing.currency} averageRating={listing.averageRating} reviewCount={listing.reviewCount} instantBook={listing.instantBook} coverImage={listing.coverImage} />)}</div>{result.totalPages > 1 && <div className="mt-10 flex flex-wrap items-center justify-center gap-3"><Link href={pageHref(searchParams, Math.max(1, page - 1))} className={page <= 1 ? "pointer-events-none opacity-40" : ""} aria-disabled={page <= 1}><Button variant="outline" size="sm" className="rounded-full">Previous</Button></Link><span className="text-sm text-muted-foreground">Page {result.page} of {result.totalPages}</span><Link href={pageHref(searchParams, Math.min(result.totalPages, page + 1))} className={page >= result.totalPages ? "pointer-events-none opacity-40" : ""} aria-disabled={page >= result.totalPages}><Button variant="outline" size="sm" className="rounded-full">Next</Button></Link></div>}</>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
