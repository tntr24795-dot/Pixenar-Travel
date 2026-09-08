import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rizdfexhrpqijufviyyx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpemRmZXhocnBxaWp1ZnZpeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4ODk3OTcsImV4cCI6MjEwMTQ2NTc5N30._VN4qmUQkhnIBi9yNA8J39RIt_BdFf2oZq3OX0xqZws";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Runs with the anon key + the signed-in user's session
 * (from cookies), so RLS still applies — this is the client every page and
 * every "read" API route should use.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component with no response to write to —
          // safe to ignore as long as middleware.ts refreshes the session.
        }
      },
    },
  });
}
