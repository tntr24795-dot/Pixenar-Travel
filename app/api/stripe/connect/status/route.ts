import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * GET /api/stripe/connect/status
 *
 * Returns the caller's own Stripe Connect onboarding/charges/payouts
 * booleans, kept in sync by the `account.updated` webhook handler.
 */
export async function GET() {
  // See the matching comment in ../onboarding/route.ts — type-only cast to
  // work around a pre-existing @supabase/ssr vs @supabase/supabase-js
  // version mismatch in this environment.
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("stripe_account_id, stripe_onboarding_complete, charges_enabled, payouts_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    hasStripeAccount: Boolean(hostProfile?.stripe_account_id),
    onboardingComplete: hostProfile?.stripe_onboarding_complete ?? false,
    chargesEnabled: hostProfile?.charges_enabled ?? false,
    payoutsEnabled: hostProfile?.payouts_enabled ?? false,
  });
}
