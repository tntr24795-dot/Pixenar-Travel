import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Reservation details — Pixenar Travel Host",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
  completed: "Completed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  disputed: "Disputed",
};

export default async function HostReservationDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/host/reservations/${params.bookingId}`);
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .maybeSingle();

  if (!booking || booking.host_id !== user.id) {
    notFound();
  }

  const [{ data: guest }, { data: listing }, { data: priceItems }] = await Promise.all([
    supabase.from("public_profiles").select("first_name, last_name, avatar_url").eq("id", booking.guest_id).maybeSingle(),
    supabase.from("listings").select("title, instant_book").eq("id", booking.listing_id).maybeSingle(),
    supabase.from("booking_price_items").select("*").eq("booking_id", booking.id).order("created_at"),
  ]);

  const guestName = [guest?.first_name, guest?.last_name].filter(Boolean).join(" ") || "Guest";

  return (
    <div className="space-y-6">
      <Link href="/host/reservations" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to reservations
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{booking.booking_number}</h1>
          <p className="mt-1 text-muted-foreground">{listing?.title ?? "Listing"}</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {STATUS_LABEL[booking.status] ?? booking.status}
        </Badge>
      </div>

      {/*
        This schema has no "requested" booking status distinct from
        pending_payment/confirmed — a booking becomes `confirmed`
        automatically once the Stripe webhook sees a successful payment, and
        that happens whether or not the listing has `instant_book` set. So
        there is no accept/reject action to build here: we just show the
        booking's real status. A true "host must approve" (non-instant)
        flow would need a new booking status (e.g. `awaiting_host_approval`)
        added to the schema/webhook logic — out of scope for this MVP.
      */}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stay details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Guest</p>
              <p className="font-medium">{guestName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dates</p>
              <p className="font-medium">
                {booking.check_in} → {booking.check_out} ({booking.number_of_nights} nights)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Guests</p>
              <p className="font-medium">
                {booking.adults} adults, {booking.children} children, {booking.infants} infants,{" "}
                {booking.pets} pets
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment status</p>
              <p className="font-medium capitalize">{booking.payment_status}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest total</span>
              <span className="font-medium">{formatCents(booking.total_cents, booking.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your payout</span>
              <span className="font-medium">{formatCents(booking.host_payout_cents, booking.currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itemized breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {priceItems && priceItems.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {priceItems.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {item.description}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <span className="font-medium">{formatCents(item.total_amount_cents, booking.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No itemized breakdown recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
