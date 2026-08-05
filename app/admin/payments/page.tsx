import { createTypedClient as createClient } from "@/lib/admin/typed-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const dynamic = "force-dynamic";

const PROCESSING_STATUSES = ["pending", "processed", "failed", "ignored"] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partially_refunded", "failed"] as const;

function processingVariant(
  status: string
): "secondary" | "destructive" | "outline" {
  if (status === "processed") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { event_type?: string; processing_status?: string };
}) {
  const supabase = createClient();
  const { event_type = "", processing_status = "" } = searchParams;

  let query = supabase
    .from("payment_events")
    .select("id, stripe_event_id, event_type, processing_status, booking_id, created_at, processed_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (event_type) query = query.ilike("event_type", `%${event_type}%`);
  if (processing_status) query = query.eq("processing_status", processing_status);

  const { data: events, error } = await query;
  if (error) {
    throw new Error(`Failed to load payment events: ${error.message}`);
  }

  // Summary of bookings.payment_status counts, computed client-side from a
  // bounded fetch (MVP scale — see reports page for the same pattern).
  const { data: bookingsForSummary } = await supabase
    .from("bookings")
    .select("payment_status");

  const paymentStatusCounts = PAYMENT_STATUSES.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {}
  );
  for (const b of bookingsForSummary ?? []) {
    if (b.payment_status in paymentStatusCounts) {
      paymentStatusCounts[b.payment_status] += 1;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Stripe webhook activity and booking payment status, for debugging.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bookings by payment status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {PAYMENT_STATUSES.map((s) => (
              <div key={s} className="rounded-md border border-border p-3 text-center">
                <div className="text-xl font-semibold font-display">
                  {paymentStatusCounts[s] ?? 0}
                </div>
                <div className="text-xs capitalize text-muted-foreground">
                  {s.replace(/_/g, " ")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event_type">Event type contains</Label>
          <Input
            id="event_type"
            name="event_type"
            placeholder="e.g. payment_intent"
            defaultValue={event_type}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="processing_status">Processing status</Label>
          <select
            id="processing_status"
            name="processing_status"
            defaultValue={processing_status}
            className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {PROCESSING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="rounded-lg border border-border bg-background">
        {!events || events.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No webhook events match these filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stripe event ID</TableHead>
                <TableHead>Event type</TableHead>
                <TableHead>Processing status</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.stripe_event_id}</TableCell>
                  <TableCell>{e.event_type}</TableCell>
                  <TableCell>
                    <Badge variant={processingVariant(e.processing_status)}>
                      {e.processing_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{e.booking_id ?? "—"}</TableCell>
                  <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {e.processed_at ? new Date(e.processed_at).toLocaleString() : "—"}
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
