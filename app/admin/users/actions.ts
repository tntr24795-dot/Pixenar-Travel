"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";

/**
 * Toggle a profile's `status` between `active` and `suspended`. RLS
 * ("profiles_admin_all") already lets an admin update any profile via the
 * session-bound client, so no service-role client is needed here.
 */
export async function toggleUserStatus(profileId: string, nextStatus: "active" | "suspended") {
  const { supabase, user } = await requireAdminPage();

  const { data: before, error: fetchError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", profileId)
    .single();

  if (fetchError || !before) {
    throw new Error(fetchError?.message ?? "User not found");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status: nextStatus })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    supabase,
    adminId: user.id,
    action: nextStatus === "suspended" ? "user.suspended" : "user.reactivated",
    entityType: "profile",
    entityId: profileId,
    oldValue: { status: before.status },
    newValue: { status: nextStatus },
  });

  revalidatePath("/admin/users");
}
