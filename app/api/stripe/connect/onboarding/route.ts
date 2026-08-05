import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createConnectOnboardingLink } from "@/lib/stripe/server";
import type { Database } from "@/types/database";

/**
 * POST /api/stripe/connect/onboarding
 *
 * Gets-or-creates the caller's host_profiles row, then returns a Stripe
 * Connect Express onboarding link for them to complete.
 *
 * Uses the session-bound client for both the insert and the update: the
 * `host_profiles_insert_own` / `host_profiles_update_own_or_admin` RLS
 * policies already allow a user to write their own row, so there's no need
 * to reach for the admin client here.
 */
export async function POST(request: NextRequest) {
  // Cast: the installed @supabase/ssr version's `createServerClient()` return
  // type doesn't line up 1:1 with the newer @supabase/supabase-js
  // `SupabaseClient` generic signature in this environment (a pre-existing,
  // repo-wide dependency version mismatch — see lib/supabase/server.ts),
  // which otherwise collapses every `.from(...)` row type to `never`. This
  // is a type-only workaround; the runtime client (and the RLS it enforces)
  // is unaffected.
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  try {
    const { accountId, url } = await createConnectOnboardingLink({
      existingAccountId: hostProfile.stripe_account_id,
      email: user.email,
      returnUrl: `${appUrl}/host/onboarding`,
      refreshUrl: `${appUrl}/host/onboarding`,
    });

    if (hostProfile.stripe_account_id !== accountId) {
      const { error: updateError } = await supabase
        .from("host_profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", hostProfile.id);
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
