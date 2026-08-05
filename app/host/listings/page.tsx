import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Pencil, PlusCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PauseListingButton } from "@/components/host/pause-listing-button";

export const metadata = {
  title: "Your listings — Pixenar Travel Host",
};

const STATUS_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  draft: "outline",
  pending_review: "secondary",
  active: "default",
  paused: "secondary",
  rejected: "destructive",
  suspended: "destructive",
  archived: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Active",
  paused: "Paused",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
};

export default async function HostListingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/host/listings");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/onboarding");
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, slug, status, city, state, base_price_cents, currency")
    .eq("host_id", hostProfile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your listings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage every property you've listed on Pixenar Travel.
          </p>
        </div>
        <Button asChild>
          <Link href="/host/listings/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create listing
          </Link>
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load your listings: {error.message}
        </p>
      )}

      {!error && (!listings || listings.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-medium">You haven't created a listing yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Publish your first place in a few minutes with our guided wizard.
            </p>
            <Button asChild>
              <Link href="/host/listings/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create your first listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {listings && listings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium leading-snug">{listing.title || "Untitled listing"}</h2>
                  <Badge variant={STATUS_BADGE_VARIANT[listing.status] ?? "outline"}>
                    {STATUS_LABEL[listing.status] ?? listing.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[listing.city, listing.state].filter(Boolean).join(", ") || "Location not set"}
                </p>
                <p className="text-sm font-medium">
                  {formatCents(listing.base_price_cents, listing.currency)} / night
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/host/listings/${listing.id}/edit`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  {listing.status === "active" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/listing/${listing.slug}`} target="_blank">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                      </Link>
                    </Button>
                  )}
                  {(listing.status === "active" || listing.status === "paused") && (
                    <PauseListingButton
                      listingId={listing.id}
                      currentStatus={listing.status as "active" | "paused"}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
