import Link from "next/link";
import { notFound } from "next/navigation";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const supabase = createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .single();

  if (error || !booking) {
    notFound();
  }

  const [{ data: priceItems }, { data: listing }, { data: guest }, { data: hostProfile }] =
    await Promise.all([
      supabase
        .from("booking_price_items")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("listings")
        .select("id, title, slug, city, state, host_id")
        .eq("id", booking.listing_id)
        .single(),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .eq("id", booking.guest_id)
        .single(),
      supabase
        .from("host_profiles")
        .select("id, user_id")
        .eq("user_id", booking.host_id)
        .maybeSingle(),
    ]);

  const { data: hostAsProfile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone")
    .eq("id", booking.host_id)
    .single();

  const [{ data: cancellations }, { data: disputes }] = await Promise.all([
    supabase
      .from("cancellations")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("disputes")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Booking {booking.booking_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Created {new Date(booking.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge>{booking.status}</Badge>
          <Badge variant="outline">{booking.payment_status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {listing ? (
              <>
                <Link
                  href={`/listing/${listing.slug}`}
                  target="_blank"
                  className="font-medium hover:underline"
                >
                  {listing.title}
                </Link>
                <p className="text-muted-foreground">
                  {[listing.city, listing.state].filter(Boolean).join(", ")}
                </p>
                <Link
                  href={`/admin/listings?status=`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  View all listings
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">Listing not found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {guest ? (
              <>
                <p className="font-medium">
                  {[guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
                    guest.email}
                </p>
                <p className="text-muted-foreground">{guest.email}</p>
                {guest.phone && (
                  <p className="text-muted-foreground">{guest.phone}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Guest not found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {hostAsProfile ? (
              <>
                <p className="font-medium">
                  {[hostAsProfile.first_name, hostAsProfile.last_name]
                    .filter(Boolean)
                    .join(" ") || hostAsProfile.email}
                </p>
                <p className="text-muted-foreground">{hostAsProfile.email}</p>
                {hostProfile && (
                  <Link
                    href="/admin/hosts"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    View host profile
                  </Link>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Host not found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itemized breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(priceItems ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="capitalize">
                    {item.item_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(item.unit_amount_cents, booking.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(item.total_amount_cents, booking.currency)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">
                  Total charged to guest
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCents(booking.total_cents, booking.currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right text-muted-foreground">
                  Host payout
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCents(booking.host_payout_cents, booking.currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cancellations</CardTitle>
        </CardHeader>
        <CardContent>
          {!cancellations || cancellations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cancellations recorded for this booking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guest refund</TableHead>
                  <TableHead>Host payout</TableHead>
                  <TableHead>Platform fee retained</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancellations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="capitalize">{c.policy_applied}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCents(c.guest_refund_cents, booking.currency)}</TableCell>
                    <TableCell>{formatCents(c.host_payout_cents, booking.currency)}</TableCell>
                    <TableCell>
                      {formatCents(c.platform_fee_retained_cents, booking.currency)}
                    </TableCell>
                    <TableCell>{c.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          {!disputes || disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No disputes filed for this booking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell>{d.resolution ?? "—"}</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/disputes/${d.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
