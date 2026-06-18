import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | {
      ok: true;
      remaining: number;
      resetAt: number;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
      resetAt: number;
    };

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(request: Request, scope: string, options: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const redisResult = await checkRedisRateLimit(request, scope, options);
    if (redisResult) return redisResult;
  } catch {
    // Keep the app available if the optional Redis limiter is unreachable.
  }
  return checkMemoryRateLimit(request, scope, options);
}

function checkMemoryRateLimit(request: Request, scope: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);
  cleanupBuckets(now);

  if (bucket.count > options.max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, options.max - bucket.count),
    resetAt: bucket.resetAt
  };
}

async function checkRedisRateLimit(request: Request, scope: string, options: RateLimitOptions): Promise<RateLimitResult | undefined> {
  const env = getServerEnv();
  if (!env.upstashRedisRestUrl || !env.upstashRedisRestToken) return undefined;

  const now = Date.now();
  const key = `rl:${scope}:${clientKey(request)}`;
  const resetKey = `${key}:reset`;
  const baseUrl = env.upstashRedisRestUrl.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${env.upstashRedisRestToken}` };
  const [count, resetAtRaw] = await Promise.all([
    upstashCommand<number>(baseUrl, headers, ["INCR", key]),
    upstashCommand<string | null>(baseUrl, headers, ["GET", resetKey])
  ]);
  let resetAt = Number(resetAtRaw ?? 0);
  if (!resetAt || resetAt <= now || count === 1) {
    resetAt = now + options.windowMs;
    const ttlSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
    await Promise.all([upstashCommand(baseUrl, headers, ["EXPIRE", key, ttlSeconds]), upstashCommand(baseUrl, headers, ["SET", resetKey, String(resetAt), "EX", ttlSeconds])]);
  }

  if (count > options.max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, options.max - count),
    resetAt
  };
}

async function upstashCommand<T = unknown>(baseUrl: string, headers: Record<string, string>, command: Array<string | number>) {
  const response = await fetch(`${baseUrl}/pipeline`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });
  if (!response.ok) {
    throw new Error(`Redis rate limit request failed with ${response.status}.`);
  }
  const payload = (await response.json()) as Array<{ result?: T; error?: string }>;
  if (payload[0]?.error) {
    throw new Error(payload[0].error);
  }
  return payload[0]?.result as T;
}

export function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    {
      error: "Too many requests. Please wait before trying again.",
      retryAfterSeconds: result.retryAfterSeconds
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Reset": new Date(result.resetAt).toISOString()
      }
    }
  );
}

export function requestTooLargeResponse(maxBytes: number) {
  return NextResponse.json(
    {
      error: `Request body is too large. Keep it below ${Math.round(maxBytes / 1024)} KB.`
    },
    { status: 413 }
  );
}

export function isRequestBodyTooLarge(request: Request, maxBytes: number) {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return false;
  const length = Number(rawLength);
  return !Number.isFinite(length) || length > maxBytes;
}

function clientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "local";
}

function cleanupBuckets(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
