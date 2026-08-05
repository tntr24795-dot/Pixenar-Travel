import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HostBioForm } from "@/components/host/host-bio-form";

export const metadata = {
  title: "Host settings — Pixenar Travel",
};

const IDENTITY_LABEL: Record<string, string> = {
  unverified: "Not verified",
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Verification rejected",
};

export default async function HostSettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/settings");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id, bio, identity_status, stripe_onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Host settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your public host profile and payouts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity verification</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={hostProfile.identity_status === "verified" ? "default" : "secondary"}>
            {IDENTITY_LABEL[hostProfile.identity_status] ?? hostProfile.identity_status}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hostProfile.stripe_onboarding_complete
              ? "Your Stripe payout setup is complete."
              : "You still need to finish connecting Stripe to receive payouts."}
          </p>
          <Link href="/host/onboarding" className="text-sm font-medium text-primary underline">
            {hostProfile.stripe_onboarding_complete ? "Update payout details" : "Finish Stripe onboarding"}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <HostBioForm hostProfileId={hostProfile.id} initialBio={hostProfile.bio ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
