import Link from "next/link";

import { requireAdminPage } from "@/lib/admin/require-admin";
import { APP_NAME } from "@/constants";
import { AdminNav } from "./admin-nav";

/**
 * Admin shell — every page under `app/admin/**` renders inside this layout.
 * `middleware.ts` already gates `/admin/**` behind `role === 'admin'`; this
 * re-checks server-side (defense in depth, same pattern as middleware.ts)
 * before rendering any admin data.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdminPage();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:flex md:flex-col">
        <div className="border-b border-border px-5 py-5">
          <Link href="/admin/dashboard" className="font-display text-lg font-semibold">
            {APP_NAME} <span className="text-muted-foreground">Admin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          Signed in as
          <div className="truncate font-medium text-foreground">{profile.email}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4 md:hidden">
          <Link href="/admin/dashboard" className="font-display text-lg font-semibold">
            {APP_NAME} Admin
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
