"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rizdfexhrpqijufviyyx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpemRmZXhocnBxaWp1ZnZpeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4ODk3OTcsImV4cCI6MjEwMTQ2NTc5N30._VN4qmUQkhnIBi9yNA8J39RIt_BdFf2oZq3OX0xqZws";

/**
 * Browser-side Supabase client. Uses the anon key + RLS — safe to ship to
 * the client. Never import the service-role client (lib/supabase/admin.ts)
 * into any file that runs in the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
