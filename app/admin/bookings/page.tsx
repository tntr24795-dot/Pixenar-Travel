import Link from "next/link";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { BOOKING_STATUSES } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function statusVariant(status: string): "secondary" | "destructive" | "outline" {
  if (status === "confirmed" || status === "completed") return "secondary";
  if (["cancelled", "expired", "disputed"].includes(status)) return "destructive";
  return "outline";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const { status = "", from = "", to = "" } = searchParams;

  let query = supabase
    .from("bookings")
    .select(
      "id, booking_number, listing_id, guest_id, host_id, check_in, check_out, status, payment_status, total_cents, currency, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("check_in", from);
  if (to) query = query.lte("check_in", to);

  const { data: bookings, error } = await query;
  if (error) {
    throw new Error(`Failed to load bookings: ${error.message}`);
  }

  const listingIds = Array.from(new Set((bookings ?? []).map((b) => b.listing_id)));
  const { data: listings } =
    listingIds.length > 0
      ? await supabase.from("listings").select("id, title").in("id", listingIds)
      : { data: [] };
  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          {(bookings ?? []).length} booking
          {(bookings ?? []).length === 1 ? "" : "s"} shown (max 200).
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">Check-in from</Label>
          <Input id="from" name="from" type="date" defaultValue={from} className="w-44" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Check-in to</Label>
          <Input id="to" name="to" type="date" defaultValue={to} className="w-44" />
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!bookings || bookings.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No bookings match these filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium hover:underline"
                    >
                      {b.booking_number}
                    </Link>
                  </TableCell>
                  <TableCell>{listingById.get(b.listing_id)?.title ?? "—"}</TableCell>
                  <TableCell>
                    {b.check_in} → {b.check_out}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{b.payment_status}</TableCell>
                  <TableCell>{formatCents(b.total_cents, b.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
