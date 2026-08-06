import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { HostCalendarClient } from "@/components/host/host-calendar-client";

export const metadata = {
  title: "Calendar — Havena Host",
};

export default async function HostCalendarPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/calendar");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, base_price_cents, minimum_nights, currency")
    .eq("host_id", hostProfile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          Block dates or set custom pricing for any of your listings.
        </p>
      </div>
      <HostCalendarClient listings={listings ?? []} />
    </div>
  );
}
