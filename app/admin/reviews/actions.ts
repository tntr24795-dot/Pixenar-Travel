"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";

/**
 * Toggle a review's moderation status between `published` and `hidden`.
 * RLS ("reviews_update_own_or_admin") lets an admin update any review via
 * the session-bound client. Per the client's spec, hosts can never delete a
 * review themselves — this admin page is the only place hide/show happens.
 */
export async function toggleReviewStatus(reviewId: string, nextStatus: "published" | "hidden") {
  const { supabase, user } = await requireAdminPage();

  const { data: before, error: fetchError } = await supabase
    .from("reviews")
    .select("status")
    .eq("id", reviewId)
    .single();

  if (fetchError || !before) {
    throw new Error(fetchError?.message ?? "Review not found");
  }

  const { error } = await supabase
    .from("reviews")
    .update({ status: nextStatus })
    .eq("id", reviewId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId: user.id,
    action: nextStatus === "hidden" ? "review.hidden" : "review.published",
    entityType: "review",
    entityId: reviewId,
    oldValue: { status: before.status },
    newValue: { status: nextStatus },
  });

  revalidatePath("/admin/reviews");
}
