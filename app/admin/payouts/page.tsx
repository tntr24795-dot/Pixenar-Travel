import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
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

export default async function AdminPayoutsPage() {
  const supabase = createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_number, host_id, host_payout_cents, currency, stripe_transfer_id, confirmed_at, check_in, check_out"
    )
    .not("stripe_transfer_id", "is", null)
    .order("confirmed_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to load payouts: ${error.message}`);
  }

  const hostIds = Array.from(new Set((bookings ?? []).map((b) => b.host_id)));
  const { data: hosts } =
    hostIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", hostIds)
      : { data: [] };
  const hostById = new Map((hosts ?? []).map((h) => [h.id, h]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Bookings whose host payout has been transferred via Stripe Connect
            ({(bookings ?? []).length} shown, max 200).
          </p>
        </div>
        <a
          href="https://dashboard.stripe.com/connect/transfers"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Stripe payout dashboard <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        This table only lists which bookings have transferred (
        <code>stripe_transfer_id</code> is set) and how much/when. For the
        actual payout schedule, arrival dates, and bank-account-level detail,
        use the Stripe dashboard link above rather than a reimplementation
        here — Stripe is the source of truth for payout timing.
      </p>

      <div className="rounded-lg border border-border bg-background">
        {!bookings || bookings.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No transfers recorded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Payout amount</TableHead>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Confirmed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const host = hostById.get(b.host_id);
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium hover:underline"
                      >
                        {b.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {host
                        ? [host.first_name, host.last_name]
                            .filter(Boolean)
                            .join(" ") || host.email
                        : b.host_id}
                    </TableCell>
                    <TableCell>
                      {b.check_in} → {b.check_out}
                    </TableCell>
                    <TableCell>
                      {formatCents(b.host_payout_cents, b.currency)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.stripe_transfer_id}
                    </TableCell>
                    <TableCell>
                      {b.confirmed_at
                        ? new Date(b.confirmed_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
