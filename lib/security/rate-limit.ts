import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export async function consumeRateLimit(
  bucketKey: string,
  windowSeconds: number,
  limit: number
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { data, error } = await (admin as any).rpc("consume_api_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Rate limit check returned no result");
  }

  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining ?? 0),
    resetAt: String(row.reset_at),
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetMs = new Date(result.resetAt).getTime() - Date.now();
  return {
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": result.resetAt,
    "Retry-After": String(Math.max(1, Math.ceil(resetMs / 1000))),
  };
}
