import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";

export interface WriteAuditLogParams {
  /** Session-bound Supabase client (from `lib/supabase/server`) for the signed-in admin. */
  supabase: SupabaseClient<Database>;
  /** `profiles.id` of the admin performing the action. */
  adminId: string;
  /** Short machine-readable action name, e.g. "listing.approved", "user.status_changed". */
  action: string;
  /** Table/entity the action targets, e.g. "profile", "listing", "host_profile", "dispute", "review". */
  entityType: string;
  entityId?: string | null;
  oldValue?: Json | null;
  newValue?: Json | null;
}

/**
 * Shared helper every admin mutation must call after it changes data, so the
 * `admin_audit_logs` table has a durable, queryable trail of who did what.
 * `admin_audit_logs` RLS ("admin_audit_logs_admin_all") already lets any
 * signed-in admin insert here via the session-bound client — no service-role
 * client needed.
 *
 * This is best-effort: by the time this is called the underlying mutation has
 * already been committed, so a logging failure shouldn't be surfaced to the
 * admin as if their action failed. We log loudly to the server console
 * instead so it can be caught by monitoring.
 */
export async function writeAuditLog({
  supabase,
  adminId,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
}: WriteAuditLogParams): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[admin_audit_logs] failed to record action="${action}" entity_type="${entityType}" entity_id="${entityId}":`,
      error
    );
  }
}
