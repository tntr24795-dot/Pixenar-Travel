import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ListingWizard } from "@/components/host/listing-wizard/wizard";

export const metadata = {
  title: "Create a listing — Pixenar Travel Host",
};

export default async function NewListingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/listings/new");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Create a new listing</h1>
        <p className="mt-1 text-muted-foreground">
          Walk through the steps below — you can leave and come back, but progress in this
          session isn't saved until you submit at the end.
        </p>
      </div>
      <ListingWizard mode="create" hostProfileId={hostProfile.id} />
    </div>
  );
}
