import Link from "next/link";
import { Compass, Menu } from "lucide-react";

import { NAV_LINKS, APP_NAME } from "@/constants";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavbarAuth } from "@/components/layout/navbar-auth";

/**
 * Server Component wrapper: loads the signed-in user (if any) plus whatever
 * we need to decide which links show (host/admin), then hands everything to
 * the client-side `NavbarAuth` for the interactive avatar dropdown.
 */
export async function Navbar() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  type ProfileRow = { first_name: string | null; role: string };
  type HostRow = { id: string };

  let profile: ProfileRow | null = null;
  let isHost = false;

  if (user) {
    const [{ data: profileRow }, { data: hostRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("host_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Cast explicitly: the generated Database type currently resolves through
    // `createServerClient` to `never` for row results in this project's
    // TypeScript/Supabase package combination (a pre-existing infra issue,
    // not specific to this query) — the shapes below match the `profiles`
    // and `host_profiles` tables in types/database.ts.
    profile = (profileRow as ProfileRow | null) ?? null;
    isHost = Boolean(hostRow as HostRow | null);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 shadow-[0_1px_0_rgb(255_255_255/0.5)] backdrop-blur-xl">
      <div className="container flex h-[4.5rem] items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-primary after:transition-all hover:text-foreground hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <NavbarAuth
            user={
              user
                ? {
                    email: user.email ?? "",
                    firstName: profile?.first_name ?? null,
                    role: profile?.role ?? "guest",
                    isHost,
                  }
                : null
            }
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle className="text-left font-display">
                {APP_NAME}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-border pt-4">
                <NavbarAuth
                  mobile
                  user={
                    user
                      ? {
                          email: user.email ?? "",
                          firstName: profile?.first_name ?? null,
                          role: profile?.role ?? "guest",
                          isHost,
                        }
                      : null
                  }
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
