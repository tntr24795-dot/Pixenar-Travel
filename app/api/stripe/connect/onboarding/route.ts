import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createConnectOnboardingLink,
  getConnectAccountStatus,
} from "@/lib/stripe/server";
import type { Database } from "@/types/database";

/**
 * POST /api/stripe/connect/onboarding
 *
 * Gets-or-creates the caller's host_profiles row, reconciles an existing
 * connected account from Stripe, and otherwise returns a Stripe Connect
 * Express onboarding link.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let hostProfile = (
    await supabase.from("host_profiles").select("*").eq("user_id", user.id).maybeSingle()
  ).data;

  if (!hostProfile) {
    const { data: inserted, error: insertError } = await supabase
      .from("host_profiles")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (insertError || !inserted) {
      console.error("Failed to create host_profiles row", insertError);
      return NextResponse.json({ error: "failed_to_create_host_profile" }, { status: 500 });
    }
    hostProfile = inserted;
  }

  // Always keep Stripe redirects on the same public origin that received the
  // request. This avoids stale NEXT_PUBLIC_APP_URL values sending hosts to a
  // deleted preview or unrelated deployment.
  const appUrl = request.nextUrl.origin;
  const admin = createAdminClient();

  // The existing sandbox account may already be fully onboarded. In that
  // case, reconcile the local cache and send the host straight to the
  // dashboard instead of asking Stripe for a second onboarding flow.
  if (hostProfile.stripe_account_id) {
    try {
      const status = await getConnectAccountStatus(hostProfile.stripe_account_id);
      const { error: syncError } = await admin
        .from("host_profiles")
        .update({
          stripe_onboarding_complete: status.stripeOnboardingComplete,
          charges_enabled: status.chargesEnabled,
          payouts_enabled: status.payoutsEnabled,
        })
        .eq("id", hostProfile.id)
        .eq("user_id", user.id);

      if (syncError) {
        console.error("Failed to sync existing Stripe Connect account", syncError);
        return NextResponse.json({ error: "stripe_status_sync_failed" }, { status: 502 });
      }

      if (
        status.stripeOnboardingComplete &&
        status.chargesEnabled &&
        status.payoutsEnabled
      ) {
        return NextResponse.json({
          url: `${appUrl}/host/dashboard`,
          alreadyComplete: true,
        });
      }
    } catch (err) {
      console.error("Failed to retrieve existing Stripe Connect account", err);
      return NextResponse.json({ error: "stripe_account_unavailable" }, { status: 502 });
    }
  }

  try {
    const { accountId, url } = await createConnectOnboardingLink({
      existingAccountId: hostProfile.stripe_account_id,
      email: user.email,
      returnUrl: `${appUrl}/host/onboarding`,
      refreshUrl: `${appUrl}/host/onboarding`,
    });

    if (hostProfile.stripe_account_id !== accountId) {
      const { error: updateError } = await admin
        .from("host_profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", hostProfile.id)
        .eq("user_id", user.id);
      if (updateError) {
        console.error("Failed to store stripe_account_id on host_profiles", updateError);
      }
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("createConnectOnboardingLink failed", err);
    return NextResponse.json({ error: "stripe_onboarding_link_failed" }, { status: 502 });
  }
}
