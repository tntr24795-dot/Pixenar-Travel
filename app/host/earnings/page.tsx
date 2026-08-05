import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EarningsChart, type EarningsPoint } from "@/components/host/earnings-chart";

export const metadata = {
  title: "Earnings — Pixenar Travel Host",
};

export default async function HostEarningsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/earnings");
  }

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, booking_number, check_in, host_payout_cents, currency, status, stripe_transfer_id")
    .eq("host_id", user.id)
    .in("status", ["confirmed", "completed"])
    .order("check_in", { ascending: true });

  const byMonth = new Map<string, number>();
  for (const booking of bookings ?? []) {
    const month = booking.check_in.slice(0, 7); // yyyy-MM
    byMonth.set(month, (byMonth.get(month) ?? 0) + booking.host_payout_cents);
  }
  const chartData: EarningsPoint[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amountCents]) => ({ month, amountCents }));

  const totalCents = (bookings ?? []).reduce((sum, b) => sum + b.host_payout_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Earnings</h1>
        <p className="mt-1 text-muted-foreground">
          Payouts from confirmed and completed reservations.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load earnings: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between">
            <span>Payouts over time</span>
            <span className="text-2xl font-semibold">{formatCents(totalCents)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <EarningsChart data={chartData} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No completed payouts yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings && bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Stripe transfer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 font-medium">{booking.booking_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{booking.check_in}</td>
                      <td className="px-4 py-3">{formatCents(booking.host_payout_cents, booking.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {booking.stripe_transfer_id ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No payouts yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
