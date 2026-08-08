import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { BOOKING_STATUSES } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Reservations — Pixenar Travel Host",
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

export default async function HostReservationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/reservations");
  }

  const statusFilter = searchParams.status;

  let query = supabase
    .from("bookings")
    .select(
      "id, booking_number, check_in, check_out, status, total_cents, host_payout_cents, currency, listing_id, guest_id"
    )
    .eq("host_id", user.id)
    .order("check_in", { ascending: false });

  if (statusFilter && (BOOKING_STATUSES as readonly string[]).includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data: bookings, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Reservations</h1>
        <p className="mt-1 text-muted-foreground">Every booking made across your listings.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/host/reservations"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !statusFilter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
          )}
        >
          All
        </Link>
        {BOOKING_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/host/reservations?status=${status}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              statusFilter === status
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {STATUS_LABEL[status]}
          </Link>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load reservations: {error.message}
        </p>
      )}

      {!error && (!bookings || bookings.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No reservations {statusFilter ? `with status "${STATUS_LABEL[statusFilter]}"` : "yet"}.
          </CardContent>
        </Card>
      )}

      {bookings && bookings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Guest total</th>
                <th className="px-4 py-3">Your payout</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 font-medium">{booking.booking_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {booking.check_in} → {booking.check_out}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{STATUS_LABEL[booking.status] ?? booking.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatCents(booking.total_cents, booking.currency)}</td>
                  <td className="px-4 py-3">{formatCents(booking.host_payout_cents, booking.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/host/reservations/${booking.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
