import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectAccountStatus } from "@/lib/stripe/server";
import type { Database } from "@/types/database";

/**
 * GET /api/stripe/connect/status
 *
 * Returns the caller's own Stripe Connect state. When a connected account is
 * already present, Stripe is the source of truth and the local cache is
 * reconciled server-side with the service-role client.
 */
export async function GET() {
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id, stripe_account_id, stripe_onboarding_complete, charges_enabled, payouts_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (hostProfile?.stripe_account_id) {
    try {
      const status = await getConnectAccountStatus(hostProfile.stripe_account_id);
      const admin = createAdminClient();
      const { error } = await admin
        .from("host_profiles")
        .update({
          stripe_onboarding_complete: status.stripeOnboardingComplete,
          charges_enabled: status.chargesEnabled,
          payouts_enabled: status.payoutsEnabled,
        })
        .eq("id", hostProfile.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to reconcile Stripe Connect status", error);
      } else {
        return NextResponse.json({
          hasStripeAccount: true,
          onboardingComplete: status.stripeOnboardingComplete,
          chargesEnabled: status.chargesEnabled,
          payoutsEnabled: status.payoutsEnabled,
        });
      }
    } catch (error) {
      console.error("Failed to read Stripe Connect account status", error);
    }
  }

  return NextResponse.json({
    hasStripeAccount: Boolean(hostProfile?.stripe_account_id),
    onboardingComplete: hostProfile?.stripe_onboarding_complete ?? false,
    chargesEnabled: hostProfile?.charges_enabled ?? false,
    payoutsEnabled: hostProfile?.payouts_enabled ?? false,
  });
}
