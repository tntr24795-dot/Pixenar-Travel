import { NextResponse, type NextRequest } from "next/server";

import { expireStaleHolds } from "@/services/booking.service";

/**
 * Frees up stale 15-minute booking holds (see BOOKING_HOLD_MINUTES in
 * @/constants). This environment has no persistent background worker, so
 * this route must be invoked by an external scheduler — wire up Vercel Cron
 * (or any other scheduler) to hit this endpoint every 1-5 minutes, e.g.:
 *
 *   // vercel.json
 *   { "crons": [{ "path": "/api/cron/expire-holds?secret=...", "schedule": "*\/2 * * * *" }] }
 *
 * Authorization is a shared secret (CRON_SECRET) rather than a user
 * session, since this is meant to be called by a scheduler, not a browser.
 * Accepts the secret either as an `x-cron-secret` header or a `?secret=`
 * query param so it works with schedulers that can't set custom headers.
 */
export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed if the secret isn't configured

  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === expected || querySecret === expected;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireStaleHolds();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("expire-holds cron failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
