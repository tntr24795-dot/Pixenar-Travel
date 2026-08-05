import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/types/database";

type Booking = Tables<"bookings">;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  pending_payment: "secondary",
  completed: "outline",
  cancelled: "destructive",
  expired: "destructive",
  refunded: "outline",
  partially_refunded: "outline",
  disputed: "destructive",
};

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TripsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/trips");
  }

  // RLS (`bookings_select_participant_or_admin`) already restricts this to
  // bookings where guest_id = auth.uid() (or host_id, or admin) — the
  // .eq("guest_id", user.id) below is just an explicit, readable filter on
  // top of that, not the source of the authorization.
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("guest_id", user.id)
    .order("check_in", { ascending: false });

  const listingIds = Array.from(new Set((bookings ?? []).map((b) => b.listing_id)));

  const [{ data: listings }, { data: images }] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id, title, slug, city, state").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string; city: string | null; state: string | null }[] }),
    listingIds.length
      ? supabase
          .from("listing_images")
          .select("listing_id, public_url, is_cover, sort_order")
          .in("listing_id", listingIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as { listing_id: string; public_url: string; is_cover: boolean; sort_order: number }[] }),
  ]);

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const coverByListing = new Map<string, string>();
  for (const img of images ?? []) {
    const existing = coverByListing.has(img.listing_id);
    if (img.is_cover || !existing) {
      coverByListing.set(img.listing_id, img.public_url);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const all = bookings ?? [];

  const upcoming = all.filter(
    (b) =>
      b.check_in >= todayIso && (b.status === "confirmed" || b.status === "pending_payment")
  );
  const past = all.filter((b) => !upcoming.includes(b));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Trips</h1>
        <p className="text-muted-foreground">Your upcoming and past stays.</p>
      </div>

      <TripSection
        title="Upcoming"
        bookings={upcoming}
        listingById={listingById}
        coverByListing={coverByListing}
        emptyText="No upcoming trips yet. When you book a stay, it'll show up here."
      />

      <TripSection
        title="Past"
        bookings={past}
        listingById={listingById}
        coverByListing={coverByListing}
        emptyText="You don't have any past trips yet."
      />
    </div>
  );
}

function TripSection({
  title,
  bookings,
  listingById,
  coverByListing,
  emptyText,
}: {
  title: string;
  bookings: Booking[];
  listingById: Map<string, { id: string; title: string; slug: string; city: string | null; state: string | null }>;
  coverByListing: Map<string, string>;
  emptyText: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => {
            const listing = listingById.get(booking.listing_id);
            const cover = coverByListing.get(booking.listing_id);
            return (
              <Link key={booking.id} href={`/account/trips/${booking.id}`}>
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={listing?.title ?? "Listing photo"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-medium">
                        {listing?.title ?? "Listing no longer available"}
                      </h3>
                      <Badge variant={STATUS_BADGE_VARIANT[booking.status] ?? "secondary"}>
                        {statusLabel(booking.status)}
                      </Badge>
                    </div>
                    {listing?.city && (
                      <p className="text-xs text-muted-foreground">
                        {listing.city}
                        {listing.state ? `, ${listing.state}` : ""}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(`${booking.check_in}T00:00:00`), "MMM d, yyyy")} –{" "}
                      {format(new Date(`${booking.check_out}T00:00:00`), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCents(booking.total_cents, booking.currency)} total
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
