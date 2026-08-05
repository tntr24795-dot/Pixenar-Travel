import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { searchListings } from "@/lib/listings/searchListings";
import type { Database } from "@/types/database";

// Always hits Supabase fresh -- results depend on the caller's session (RLS)
// and on live availability/price data, so this must never be statically cached.
export const dynamic = "force-dynamic";

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

function parseSearchParams(searchParams: URLSearchParams): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of SIMPLE_KEYS) {
    const value = searchParams.get(key);
    if (value !== null && value !== "") raw[key] = value;
  }
  const amenities = searchParams.getAll("amenities");
  if (amenities.length > 0) raw.amenities = amenities;
  return raw;
}

/**
 * GET /api/listings?location=&checkIn=&checkOut=&adults=&...&page=&pageSize=
 *
 * Public search endpoint. RLS on `listings` (see
 * supabase/migrations/0002_rls.sql) already restricts anon/authenticated
 * non-owners to `status = 'active'` rows, so no extra status filter is
 * applied here -- that's the single source of truth for visibility.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = searchQuerySchema.safeParse(parseSearchParams(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const pageSize = pageSizeParam
    ? Math.min(100, Math.max(1, parseInt(pageSizeParam, 10) || 20))
    : 20;

  try {
    // NOTE: cast works around a type-inference regression between the
    // installed @supabase/ssr and @supabase/supabase-js versions in this
    // environment, where createServerClient<Database>()'s returned client
    // loses its generic Database binding (every `.select()` degrades to
    // `never`). Casting to the plain supabase-js `SupabaseClient<Database>`
    // type restores correct row typing; the underlying client/behavior is
    // unchanged (still cookie-based, RLS-scoped).
    const supabase = createClient() as unknown as SupabaseClient<Database>;
    const result = await searchListings(supabase, { ...parsed.data, page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/listings failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
