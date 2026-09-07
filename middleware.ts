import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const HOST_PREFIX = "/host";
const ACCOUNT_PREFIX = "/account";
const ADMIN_PREFIX = "/admin";
const CHECKOUT_PREFIX = "/checkout";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rizdfexhrpqijufviyyx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpemRmZXhocnBxaWp1ZnZpeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4ODk3OTcsImV4cCI6MjEwMTQ2NTc5N30._VN4qmUQkhnIBi9yNA8J39RIt_BdFf2oZq3OX0xqZws";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const needsAuth =
      pathname.startsWith(HOST_PREFIX) ||
      pathname.startsWith(ACCOUNT_PREFIX) ||
      pathname.startsWith(ADMIN_PREFIX) ||
      pathname.startsWith(CHECKOUT_PREFIX);

    if (needsAuth && !user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith(ADMIN_PREFIX) && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return response;
  } catch (err) {
    console.error("[middleware] Supabase session check failed -- failing open:", err);
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
