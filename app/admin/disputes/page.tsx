import Link from "next/link";

import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DISPUTE_STATUSES = ["open", "under_review", "resolved", "closed"] as const;

function statusVariant(status: string): "secondary" | "destructive" | "outline" {
  if (status === "resolved" || status === "closed") return "secondary";
  if (status === "open") return "destructive";
  return "outline";
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { status = "" } = searchParams;

  let query = supabase
    .from("disputes")
    .select("id, booking_id, opened_by, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data: disputes, error } = await query;
  if (error) {
    throw new Error(`Failed to load disputes: ${error.message}`);
  }

  const bookingIds = Array.from(new Set((disputes ?? []).map((d) => d.booking_id)));
  const { data: bookings } =
    bookingIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, booking_number")
          .in("id", bookingIds)
      : { data: [] };
  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Disputes</h1>
        <p className="text-sm text-muted-foreground">
          {(disputes ?? []).length} dispute
          {(disputes ?? []).length === 1 ? "" : "s"} shown (max 200).
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
            {DISPUTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!disputes || disputes.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No disputes match this filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{bookingById.get(d.booking_id)?.booking_number ?? "—"}</TableCell>
                  <TableCell>{d.reason}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Review
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
