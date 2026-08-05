import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { writeAuditLog } from "@/lib/admin/audit";

/**
 * Single source of truth for the listing moderation mutations (approve /
 * reject / suspend), so the API routes (`app/api/admin/listings/[id]/approve`
 * and `.../reject`) and the admin page's own suspend action share one
 * implementation instead of duplicating the update + audit-log logic.
 */

interface ListingActionParams {
  supabase: SupabaseClient<Database>;
  adminId: string;
  listingId: string;
}

export async function approveListing({
  supabase,
  adminId,
  listingId,
}: ListingActionParams) {
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("status, published_at")
    .eq("id", listingId)
    .single();

  if (fetchError || !listing) {
    throw new Error(fetchError?.message ?? "Listing not found");
  }

  if (listing.status !== "pending_review") {
    throw new Error(
      `Listing is not pending review (current status: ${listing.status})`
    );
  }

  const update: { status: string; published_at?: string } = {
    status: "active",
  };
  if (!listing.published_at) {
    update.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId,
    action: "listing.approved",
    entityType: "listing",
    entityId: listingId,
    oldValue: { status: listing.status },
    newValue: { status: "active", published_at: update.published_at ?? listing.published_at },
  });
}

export async function rejectListing({
  supabase,
  adminId,
  listingId,
}: ListingActionParams) {
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .single();

  if (fetchError || !listing) {
    throw new Error(fetchError?.message ?? "Listing not found");
  }

  if (listing.status !== "pending_review") {
    throw new Error(
      `Listing is not pending review (current status: ${listing.status})`
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "rejected" })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId,
    action: "listing.rejected",
    entityType: "listing",
    entityId: listingId,
    oldValue: { status: listing.status },
    newValue: { status: "rejected" },
  });
}

export async function suspendListing({
  supabase,
  adminId,
  listingId,
}: ListingActionParams) {
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .single();

  if (fetchError || !listing) {
    throw new Error(fetchError?.message ?? "Listing not found");
  }

  if (listing.status !== "active") {
    throw new Error(
      `Only active listings can be suspended (current status: ${listing.status})`
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "suspended" })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId,
    action: "listing.suspended",
    entityType: "listing",
    entityId: listingId,
    oldValue: { status: listing.status },
    newValue: { status: "suspended" },
  });
}
