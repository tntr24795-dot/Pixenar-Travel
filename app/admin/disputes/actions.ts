"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";

export interface UpdateDisputeInput {
  status: "open" | "under_review" | "resolved" | "closed";
  adminNotes: string;
  resolution: string;
}

/**
 * Update a dispute's status/admin_notes/resolution. RLS
 * ("disputes_update_admin") already lets an admin update any dispute via the
 * session-bound client.
 */
export async function updateDispute(disputeId: string, input: UpdateDisputeInput) {
  const { supabase, user } = await requireAdminPage();

  const { data: before, error: fetchError } = await supabase
    .from("disputes")
    .select("status, admin_notes, resolution")
    .eq("id", disputeId)
    .single();

  if (fetchError || !before) {
    throw new Error(fetchError?.message ?? "Dispute not found");
  }

  const update = {
    status: input.status,
    admin_notes: input.adminNotes || null,
    resolution: input.resolution || null,
    resolved_at:
      input.status === "resolved" || input.status === "closed"
        ? new Date().toISOString()
        : null,
  };

  const { error } = await supabase
    .from("disputes")
    .update(update)
    .eq("id", disputeId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId: user.id,
    action: "dispute.updated",
    entityType: "dispute",
    entityId: disputeId,
    oldValue: before,
    newValue: update,
  });

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
}
