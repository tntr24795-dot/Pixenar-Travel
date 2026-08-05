import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: "blocked_dates" | "minimum_nights_not_met" | "no_availability_rows";
  customPricesByDate: Record<string, number>;
}

/**
 * Fast, read-only pre-check used to give the guest immediate UI feedback
 * ("these dates aren't available") before they ever reach checkout.
 *
 * This is NOT what actually prevents double-booking — that guarantee comes
 * from the `no_overlapping_bookings` exclusion constraint in the database
 * (see supabase/migrations/0001_schema.sql). Two guests can pass this check
 * at the same instant; only one of their subsequent booking inserts will be
 * accepted by Postgres. Always re-validate server-side at hold-creation time.
 */
export async function checkAvailability(
  supabase: SupabaseClient<Database>,
  listingId: string,
  checkIn: string,
  checkOut: string
): Promise<AvailabilityCheckResult> {
  const { data: rows, error } = await supabase
    .from("availability")
    .select("date, status, custom_price_cents, minimum_nights")
    .eq("listing_id", listingId)
    .gte("date", checkIn)
    .lt("date", checkOut);

  if (error) {
    throw new Error(`Failed to load availability: ${error.message}`);
  }

  const customPricesByDate: Record<string, number> = {};
  let minNightsRequirement = 0;

  for (const row of rows ?? []) {
    if (row.status === "blocked" || row.status === "booked") {
      return { available: false, reason: "blocked_dates", customPricesByDate };
    }
    if (row.custom_price_cents != null) {
      customPricesByDate[row.date] = row.custom_price_cents;
    }
    if (row.minimum_nights != null) {
      minNightsRequirement = Math.max(minNightsRequirement, row.minimum_nights);
    }
  }

  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) /
      86_400_000
  );
  if (minNightsRequirement > 0 && nights < minNightsRequirement) {
    return { available: false, reason: "minimum_nights_not_met", customPricesByDate };
  }

  return { available: true, customPricesByDate };
}
