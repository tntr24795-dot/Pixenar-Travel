"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";

/**
 * Set a host's identity verification status. RLS
 * ("host_profiles_update_own_or_admin") lets an admin update any
 * `host_profiles` row via the session-bound client.
 */
export async function setHostIdentityStatus(
  hostProfileId: string,
  nextStatus: "verified" | "rejected"
) {
  const { supabase, user } = await requireAdminPage();

  const { data: before, error: fetchError } = await supabase
    .from("host_profiles")
    .select("identity_status")
    .eq("id", hostProfileId)
    .single();

  if (fetchError || !before) {
    throw new Error(fetchError?.message ?? "Host not found");
  }

  const { error } = await supabase
    .from("host_profiles")
    .update({ identity_status: nextStatus })
    .eq("id", hostProfileId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId: user.id,
    action:
      nextStatus === "verified"
        ? "host.identity_verified"
        : "host.identity_rejected",
    entityType: "host_profile",
    entityId: hostProfileId,
    oldValue: { identity_status: before.identity_status },
    newValue: { identity_status: nextStatus },
  });

  revalidatePath("/admin/hosts");
}
