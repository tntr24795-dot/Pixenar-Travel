import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const HOST_PREFIX = "/host";
const ACCOUNT_PREFIX = "/account";
const ADMIN_PREFIX = "/admin";
// Checkout creates a real booking hold + PaymentIntent tied to a guest_id —
// it must never be reachable while signed out.
const CHECKOUT_PREFIX = "/checkout";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // This runs on Vercel's Edge Runtime, on *every* request site-wide (see
  // `config.matcher` below) -- unlike a crash in one API route, an uncaught
  // exception here takes the *entire* site down with
  // `MIDDLEWARE_INVOCATION_FAILED` for every visitor. The most common
  // trigger is `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  // being momentarily unavailable specifically to the Edge Runtime -- e.g.
  // right after a fresh deploy or an env var change, before it finishes
  // propagating across Vercel's edge network (Edge Functions are a separate
  // runtime from serverless Node functions and can lag a few seconds behind
  // them). `createServerClient(undefined, undefined, ...)` throws
  // synchronously in that window, and the `!` assertions below turn that
  // into an unhandled exception.
  //
  // If that happens, fail *open* (let the request through) instead of
  // crashing every page on the site. This is safe here specifically because
  // every actually-sensitive action already re-checks auth independently,
  // deeper in the stack, regardless of what this middleware decided:
  //   - `/admin/**` pages call `requireAdminPage()` (`lib/admin/require-admin.ts`)
  //   - `/host/**` and `/account/**` pages re-check `auth.getUser()` themselves
  //   - the actual booking-creation route (`/api/bookings/hold`) returns 401
  //     itself if unauthenticated -- so even `/checkout/**`, which has no
  //     page-level check of its own, can't be used to create a real booking
  //     without a valid session either way
  //   - every table is additionally protected by Postgres RLS
  // So the worst case of failing open is a brief UX hiccup (an unauthenticated
  // visitor sees a page render instead of an instant redirect to `/login`)
  // during a rare, short-lived window -- never a way to bypass auth on
  // anything that actually mutates data or costs money.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

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
    /*
     * Match all request paths except static assets and image optimization
     * files, so the Supabase session cookie is refreshed on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
