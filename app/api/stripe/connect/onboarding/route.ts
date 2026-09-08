import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { createConnectOnboardingLink } from "@/lib/stripe/server";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rate = await consumeRateLimit(`stripe-onboarding:${user.id}`, 300, 5);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }
  } catch (err) {
    console.error("Stripe onboarding rate limit failed", err);
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
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
