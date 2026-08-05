import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AccountSidebar } from "./_components/account-sidebar";

/**
 * Shared shell for every /account/* page: a left sidebar (top scroll-tabs on
 * mobile) with the signed-in user's avatar/name, linking to each account
 * section. `middleware.ts` already gates `/account/**` behind auth, so `user`
 * should never be null here — but we still handle it defensively in case this
 * layout is ever reached in a way middleware doesn't cover (e.g. a stale
 * session cookie race).
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.email ||
    user.email ||
    "Your account";

  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <AccountSidebar
            displayName={displayName}
            email={profile?.email ?? user.email ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
