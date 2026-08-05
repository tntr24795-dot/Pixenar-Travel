import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SearchQueryInput } from "@/lib/validation/schemas";

/**
 * Shared listing-search query logic used by BOTH `app/api/listings/route.ts`
 * (JSON API) and `app/(public)/search/page.tsx` (Server Component). Kept in
 * one place so the two never drift out of sync, and so the search page can
 * call straight into Supabase instead of round-tripping through its own API.
 *
 * NOTE: this only ever runs against the `lib/supabase/server` client, which
 * carries the caller's session and therefore RLS. `listings_select_active_or_own_or_admin`
 * (see supabase/migrations/0002_rls.sql) already restricts anon/authenticated
 * non-owners to `status = 'active'` rows -- we intentionally do NOT add an
 * extra `.eq('status', 'active')` filter here, RLS is the enforcement point.
 */

export interface SearchListingsOptions extends SearchQueryInput {
  page?: number;
  pageSize?: number;
}

export interface SearchListingCard {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  state: string | null;
  country: string | null;
  propertyType: string;
  roomType: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maximumGuests: number;
  /** Base nightly price in cents. Full quote math (fees/discounts/tax) is only
   * computed on the listing detail / checkout page via calculateBookingQuote(). */
  nightlyPriceCents: number;
  currency: string;
  averageRating: number;
  reviewCount: number;
  instantBook: boolean;
  latitude: number | null;
  longitude: number | null;
  coverImage: { publicUrl: string; altText: string | null } | null;
}

export interface SearchListingsResult {
  listings: SearchListingCard[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function searchListings(
  supabase: SupabaseClient<Database>,
  params: SearchListingsOptions
): Promise<SearchListingsResult> {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0
      ? Math.min(MAX_PAGE_SIZE, Math.floor(params.pageSize))
      : DEFAULT_PAGE_SIZE;

  // ---- date-based availability exclusion ---------------------------------
  // "Exclude listings that have any availability row blocked/booked in that
  // range" -- a straightforward two-step NOT IN is fine for MVP scale (see
  // task spec). The real double-booking guard is the DB exclusion constraint
  // on `bookings`, not this filter -- this is just search-result hygiene.
  let excludedListingIds: string[] = [];
  if (params.checkIn && params.checkOut) {
    const { data: blockedRows, error: blockedError } = await supabase
      .from("availability")
      .select("listing_id")
      .in("status", ["blocked", "booked"])
      .gte("date", params.checkIn)
      .lt("date", params.checkOut);
    if (blockedError) {
      throw new Error(`Failed to load availability: ${blockedError.message}`);
    }
    excludedListingIds = Array.from(new Set((blockedRows ?? []).map((r) => r.listing_id)));
  }

  // ---- amenities filter (a listing must have every requested amenity) ----
  let amenityMatchedListingIds: string[] | null = null;
  if (params.amenities && params.amenities.length > 0) {
    const { data: amenityRows, error: amenityError } = await supabase
      .from("amenities")
      .select("id")
      .in("name", params.amenities);
    if (amenityError) {
      throw new Error(`Failed to load amenities: ${amenityError.message}`);
    }
    const amenityIds = (amenityRows ?? []).map((a) => a.id);
    if (amenityIds.length === 0) {
      return { listings: [], page, pageSize, total: 0, totalPages: 0 };
    }

    const { data: laRows, error: laError } = await supabase
      .from("listing_amenities")
      .select("listing_id, amenity_id")
      .in("amenity_id", amenityIds);
    if (laError) {
      throw new Error(`Failed to load listing amenities: ${laError.message}`);
    }

    const matchedByListing = new Map<string, Set<string>>();
    for (const row of laRows ?? []) {
      const set = matchedByListing.get(row.listing_id) ?? new Set<string>();
      set.add(row.amenity_id);
      matchedByListing.set(row.listing_id, set);
    }
    amenityMatchedListingIds = Array.from(matchedByListing.entries())
      .filter(([, set]) => set.size === amenityIds.length)
      .map(([listingId]) => listingId);

    if (amenityMatchedListingIds.length === 0) {
      return { listings: [], page, pageSize, total: 0, totalPages: 0 };
    }
  }

  // ---- base query ----------------------------------------------------------
  let query = supabase
    .from("listings")
    .select(
      "id, slug, title, city, state, country, property_type, room_type, bedrooms, beds, bathrooms, maximum_guests, base_price_cents, currency, average_rating, review_count, instant_book, latitude, longitude, published_at",
      { count: "exact" }
    );

  if (params.location) {
    const term = `%${params.location}%`;
    query = query.or(`city.ilike.${term},state.ilike.${term},country.ilike.${term}`);
  }

  const totalGuests = (params.adults ?? 1) + (params.children ?? 0);
  if (totalGuests > 0) {
    query = query.gte("maximum_guests", totalGuests);
  }

  if (params.minPrice != null) query = query.gte("base_price_cents", params.minPrice);
  if (params.maxPrice != null) query = query.lte("base_price_cents", params.maxPrice);
  if (params.propertyType) query = query.eq("property_type", params.propertyType);
  if (params.roomType) query = query.eq("room_type", params.roomType);
  if (params.bedrooms != null) query = query.gte("bedrooms", params.bedrooms);
  if (params.beds != null) query = query.gte("beds", params.beds);
  if (params.bathrooms != null) query = query.gte("bathrooms", params.bathrooms);
  if (params.instantBook) query = query.eq("instant_book", true);

  if (excludedListingIds.length > 0) {
    query = query.not("id", "in", `(${excludedListingIds.join(",")})`);
  }
  if (amenityMatchedListingIds) {
    query = query.in("id", amenityMatchedListingIds);
  }

  switch (params.sort) {
    case "price_asc":
      query = query.order("base_price_cents", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price_cents", { ascending: false });
      break;
    case "rating":
      query = query.order("average_rating", { ascending: false });
      break;
    case "newest":
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      break;
    case "distance":
      // TODO(geo): real distance sort needs a PostGIS geography column +
      // ST_Distance/ST_DWithin against the guest's lat/lng. Not implemented
      // for MVP -- fall back to "recommended" until that lands.
      query = query
        .order("average_rating", { ascending: false })
        .order("review_count", { ascending: false });
      break;
    case "recommended":
    default:
      query = query
        .order("average_rating", { ascending: false })
        .order("review_count", { ascending: false });
      break;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to search listings: ${error.message}`);
  }

  const rows = data ?? [];
  const listingIds = rows.map((r) => r.id);

  const coverImages = new Map<string, { publicUrl: string; altText: string | null }>();
  if (listingIds.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from("listing_images")
      .select("listing_id, public_url, alt_text")
      .in("listing_id", listingIds)
      .eq("is_cover", true);
    if (imagesError) {
      throw new Error(`Failed to load cover images: ${imagesError.message}`);
    }
    for (const img of images ?? []) {
      coverImages.set(img.listing_id, { publicUrl: img.public_url, altText: img.alt_text });
    }
  }

  const listings: SearchListingCard[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    state: row.state,
    country: row.country,
    propertyType: row.property_type,
    roomType: row.room_type,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    maximumGuests: row.maximum_guests,
    nightlyPriceCents: row.base_price_cents,
    currency: row.currency,
    averageRating: row.average_rating,
    reviewCount: row.review_count,
    instantBook: row.instant_book,
    latitude: row.latitude,
    longitude: row.longitude,
    coverImage: coverImages.get(row.id) ?? null,
  }));

  const total = count ?? listings.length;
  return {
    listings,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
