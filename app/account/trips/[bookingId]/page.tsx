import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CancelBookingButton } from "./cancel-booking-button";
import { ReviewForm } from "./review-form";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

const CANCELLABLE_STATUSES = new Set(["pending_payment", "confirmed"]);

export default async function BookingDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/account/trips/${params.bookingId}`);
  }

  // RLS (`bookings_select_participant_or_admin`) enforces that only the
  // guest, host, or an admin can read this row — a mismatched id simply comes
  // back as no row, which we treat as 404.
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .maybeSingle();

  if (!booking) {
    notFound();
  }

  const [{ data: priceItems }, { data: listing }, { data: review }] = await Promise.all([
    supabase
      .from("booking_price_items")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("listings")
      .select(
        "id, title, slug, host_id, city, state, address_line_1, address_line_2, postal_code, check_in_time, check_out_time"
      )
      .eq("id", booking.listing_id)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle(),
  ]);

  const { data: cover } = listing
    ? await supabase
        .from("listing_images")
        .select("public_url")
        .eq("listing_id", listing.id)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  // `public_host_profiles` is keyed by host_profiles.id, which is
  // listings.host_id (NOT bookings.host_id — that column stores the host's
  // profiles.id/user id). So we look the host up via the listing, per spec.
  const { data: host } = listing
    ? await supabase
        .from("public_host_profiles")
        .select("*")
        .eq("id", listing.host_id)
        .maybeSingle()
    : { data: null };

  const isGuest = booking.guest_id === user.id;
  const showFullAddress = booking.status === "confirmed" || booking.status === "completed";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Booking {booking.booking_number}</p>
          <h1 className="font-display text-3xl">
            {listing ? (
              <Link href={`/listing/${listing.slug}`} className="hover:underline">
                {listing.title}
              </Link>
            ) : (
              "Listing no longer available"
            )}
          </h1>
        </div>
        <Badge className="text-sm">{statusLabel(booking.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Stay details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cover?.public_url && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                  <Image src={cover.public_url} alt={listing?.title ?? ""} fill className="object-cover" />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(`${booking.check_in}T00:00:00`), "EEE, MMM d, yyyy")}
                    {listing?.check_in_time ? ` · ${listing.check_in_time}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {format(new Date(`${booking.check_out}T00:00:00`), "EEE, MMM d, yyyy")}
                    {listing?.check_out_time ? ` · ${listing.check_out_time}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Guests</p>
                  <p className="font-medium">
                    {booking.adults} adult{booking.adults === 1 ? "" : "s"}
                    {booking.children ? `, ${booking.children} children` : ""}
                    {booking.infants ? `, ${booking.infants} infants` : ""}
                    {booking.pets ? `, ${booking.pets} pets` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {showFullAddress && listing?.address_line_1
                      ? [listing.address_line_1, listing.address_line_2, listing.city, listing.state, listing.postal_code]
                          .filter(Boolean)
                          .join(", ")
                      : [listing?.city, listing?.state].filter(Boolean).join(", ") ||
                        "Address shown once booking is confirmed"}
                  </p>
                </div>
              </div>

              {CANCELLABLE_STATUSES.has(booking.status) && isGuest && (
                <div className="pt-2">
                  <CancelBookingButton bookingId={booking.id} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {(priceItems ?? []).map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">
                      {item.description}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </span>
                    <span className="font-medium">
                      {formatCents(item.total_amount_cents, booking.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <Separator className="my-3" />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatCents(booking.total_cents, booking.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {booking.status === "completed" && isGuest && (
            <Card>
              <CardHeader>
                <CardTitle>Your review</CardTitle>
              </CardHeader>
              <CardContent>
                {review ? (
                  <ReadOnlyReview review={review} />
                ) : (
                  <ReviewForm
                    bookingId={booking.id}
                    guestId={booking.guest_id}
                    hostId={booking.host_id}
                    listingId={booking.listing_id}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your host</CardTitle>
            </CardHeader>
            <CardContent>
              {host ? (
                <div className="flex items-center gap-3">
                  <Avatar>
                    {host.avatar_url && <AvatarImage src={host.avatar_url} alt={host.first_name ?? "Host"} />}
                    <AvatarFallback>{host.first_name?.[0] ?? "H"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{host.first_name ?? "Host"}</p>
                    {typeof host.average_rating === "number" && host.total_reviews ? (
                      <p className="text-xs text-muted-foreground">
                        {host.average_rating.toFixed(1)} ★ ({host.total_reviews} reviews)
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Host info unavailable.</p>
              )}
              <Link
                href="/account/messages"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Message host
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyReview({
  review,
}: {
  review: {
    rating_overall: number;
    comment: string | null;
    host_reply: string | null;
  };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={
              n <= review.rating_overall
                ? "h-4 w-4 fill-accent text-accent"
                : "h-4 w-4 text-muted-foreground"
            }
          />
        ))}
      </div>
      {review.comment && <p className="text-sm">{review.comment}</p>}
      {review.host_reply && (
        <div className="rounded-md bg-secondary p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Host reply
          </p>
          <p>{review.host_reply}</p>
        </div>
      )}
    </div>
  );
}
