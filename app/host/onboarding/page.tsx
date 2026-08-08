import { redirect } from "next/navigation";
import { CheckCircle2, Home, ShieldCheck, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StripeOnboardingButton } from "@/components/host/onboarding-actions";

export const metadata = {
  title: "Become a host — Pixenar Travel",
};

export default async function HostOnboardingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/onboarding");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id, stripe_onboarding_complete, charges_enabled, payouts_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  // Already fully onboarded — nothing to do here.
  if (hostProfile?.stripe_onboarding_complete) {
    redirect("/host/dashboard");
  }

  if (!hostProfile) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold">Become a Pixenar Travel host</h1>
          <p className="mt-3 text-muted-foreground">
            List your place, welcome guests, and get paid securely — all backed by Stripe.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <Home className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">List your space</p>
              <p className="text-xs text-muted-foreground">
                A guided wizard walks you through every detail.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">Get reviewed</p>
              <p className="text-xs text-muted-foreground">
                Our team checks new listings before they go live.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <Wallet className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">Get paid</p>
              <p className="text-xs text-muted-foreground">
                Payouts are handled securely via Stripe Connect.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <StripeOnboardingButton createProfileFirst label="Become a host" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl text-center">
      <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" />
      <h1 className="font-display text-3xl font-semibold">Finish setting up payouts</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        You're almost ready to host — Stripe needs a few more details before you can accept
        bookings and receive payouts.
      </p>
      <div className="mt-8 flex justify-center">
        <StripeOnboardingButton createProfileFirst={false} label="Finish setting up payouts" />
      </div>
    </div>
  );
}
