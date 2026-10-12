/**
 * C3 - simple fixed-window rate limiter for the C3 API routes.
 *
 * In-memory and per server instance: on a serverless platform each instance keeps its
 * own counters, so this limits bursts from one client rather than enforcing a global
 * quota. A shared store (e.g. Redis) would be needed for a hard limit.
 */
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export const C3_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit = C3_RATE_LIMIT.limit, windowMs = C3_RATE_LIMIT.windowMs, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value as string);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "Too many requests. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
