import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Payouts — Pixenar Travel Host",
};

export default async function HostPayoutsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/payouts");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("charges_enabled, payouts_enabled, stripe_onboarding_complete, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  const { data: transfers } = await supabase
    .from("bookings")
    .select("id, booking_number, check_in, host_payout_cents, currency, stripe_transfer_id")
    .eq("host_id", user.id)
    .not("stripe_transfer_id", "is", null)
    .order("check_in", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Payouts</h1>
        <p className="mt-1 text-muted-foreground">
          Your Stripe payout status and a record of transfers to your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant={hostProfile.charges_enabled ? "default" : "secondary"}>
              Charges {hostProfile.charges_enabled ? "enabled" : "not enabled"}
            </Badge>
            <Badge variant={hostProfile.payouts_enabled ? "default" : "secondary"}>
              Payouts {hostProfile.payouts_enabled ? "enabled" : "not enabled"}
            </Badge>
          </div>

          {!hostProfile.stripe_onboarding_complete && (
            <div className="rounded-md border border-havena-gold/50 bg-havena-gold/10 p-4 text-sm">
              Your Stripe setup isn't finished yet.{" "}
              <Link href="/host/onboarding" className="font-medium text-primary underline">
                Finish onboarding
              </Link>{" "}
              to start receiving payouts.
            </div>
          )}

          <Button asChild variant="outline">
            <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
              Open Stripe dashboard <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Detailed payout schedules and bank transfer timing are managed directly by Stripe —
            view them in your Stripe Express dashboard.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transfers && transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Stripe transfer ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transfers.map((t: NonNullable<typeof transfers>[number]) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium">{t.booking_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.check_in}</td>
                      <td className="px-4 py-3">{formatCents(t.host_payout_cents, t.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {t.stripe_transfer_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No transfers yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
