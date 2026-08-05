import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createTypedClient } from "@/lib/admin/typed-client";
import type { Database, Tables } from "@/types/database";

/**
 * Defense-in-depth admin gate for Server Components/pages (in addition to
 * `middleware.ts`, which already redirects non-admins away from `/admin/**`).
 * Re-fetches the caller's `profiles` row using the session-bound client so
 * role is never trusted from anything client-supplied, and redirects non-
 * admins away exactly like `middleware.ts` does.
 */
export async function requireAdminPage() {
  const supabase = createTypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return { supabase, user, profile: profile as Tables<"profiles"> };
}

type RequireAdminApiResult =
  | { ok: true; supabase: SupabaseClient<Database>; user: { id: string }; profile: Tables<"profiles"> }
  | { ok: false; response: NextResponse };

/**
 * Same admin re-check as `requireAdminPage`, but for Route Handlers — returns
 * a 401/403 JSON response instead of doing a Next.js `redirect()`, since API
 * routes are called via `fetch()` from client code, not navigated to.
 */
export async function requireAdminApi(): Promise<RequireAdminApiResult> {
  const supabase = createTypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, supabase, user, profile: profile as Tables<"profiles"> };
}
