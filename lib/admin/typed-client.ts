import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * `lib/supabase/server.ts`'s `createClient()` is built on `@supabase/ssr`'s
 * `createServerClient<Database>(...)`. The version of `@supabase/ssr`
 * installed in this project (0.5.2) forwards its `Database` generic to
 * `@supabase/supabase-js`'s `SupabaseClient` class using an older 3-argument
 * generic shape, while the installed `@supabase/supabase-js` (2.112.0) has
 * since changed that class's generic signature/order. The practical effect:
 * every `.from(table).select(...)` called through the session-bound client
 * types its `data` as `never[]`, even though the runtime object (cookies,
 * RLS, everything) is completely correct — reproduced identically with a
 * bare `createServerClient<Database>(...)` call with no Havena code
 * involved, and identically for every existing page in the app that uses
 * `lib/supabase/server.ts`, not just this admin section.
 *
 * We don't own `lib/supabase/server.ts` (or the installed package
 * versions) and shouldn't fix it there. This is a type-only re-cast — the
 * underlying client object is unchanged — that restores accurate row
 * typing for every query made through it in the admin section.
 */
export function createTypedClient(): SupabaseClient<Database> {
  return createSessionClient() as unknown as SupabaseClient<Database>;
}
