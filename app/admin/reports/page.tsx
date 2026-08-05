import Link from "next/link";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookingsOverTimeChart,
  RevenueOverTimeChart,
  TopListingsChart,
  type DailyPoint,
  type TopListingPoint,
} from "./charts";

export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const rangeDays = searchParams.range === "90" ? 90 : 30;

  const supabase = createClient();

  const since = new Date();
  since.setDate(since.getDate() - rangeDays);
  const sinceIso = since.toISOString();

  // Bounded, MVP-scale fetch — client-side grouping is fine here per the
  // build guideline (no materialized views needed at this scale).
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, listing_id, created_at, status, guest_service_fee_cents")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load bookings for reports: ${error.message}`);
  }

  // ---- Bookings & revenue over time --------------------------------------
  const byDay = new Map<string, DailyPoint>();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = isoDay(d);
    byDay.set(key, { date: key, bookings: 0, revenueCents: 0 });
  }

  for (const b of bookings ?? []) {
    const key = b.created_at.slice(0, 10);
    const point = byDay.get(key);
    if (!point) continue;
    point.bookings += 1;
    if (b.status === "confirmed" || b.status === "completed") {
      point.revenueCents += b.guest_service_fee_cents ?? 0;
    }
  }
  const dailyPoints = Array.from(byDay.values());

  // ---- Top listings by booking count (within range) ----------------------
  const countByListing = new Map<string, number>();
  for (const b of bookings ?? []) {
    countByListing.set(b.listing_id, (countByListing.get(b.listing_id) ?? 0) + 1);
  }
  const topListingIds = Array.from(countByListing.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const { data: listingTitles } =
    topListingIds.length > 0
      ? await supabase
          .from("listings")
          .select("id, title")
          .in(
            "id",
            topListingIds.map(([id]) => id)
          )
      : { data: [] };
  const titleById = new Map((listingTitles ?? []).map((l) => [l.id, l.title]));

  const topListings: TopListingPoint[] = topListingIds
    .map(([id, count]) => ({
      title: titleById.get(id) ?? id,
      bookings: count,
    }))
    .reverse(); // horizontal bar chart reads bottom-up

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Aggregates over the last {rangeDays} days, computed from a
            bounded, admin-only fetch.
          </p>
        </div>
        <div className="flex gap-2 rounded-md border border-border p-1">
          {[30, 90].map((r) => (
            <Link
              key={r}
              href={`/admin/reports?range=${r}`}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium",
                rangeDays === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings created over time</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingsOverTimeChart data={dailyPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Revenue over time (guest service fee)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueOverTimeChart data={dailyPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top listings by booking count</CardTitle>
        </CardHeader>
        <CardContent>
          {topListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings in this range yet.
            </p>
          ) : (
            <TopListingsChart data={topListings} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
