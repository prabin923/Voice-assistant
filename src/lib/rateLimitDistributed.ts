import { checkRateLimit, type RateLimitResult } from "@/lib/rateLimit";

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function upstashRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { maxRequests = 60, windowMs = 60000 } = options;
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `rl:${identifier}:${bucket}`;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec],
      ]),
    });

    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const data = (await res.json()) as { result?: unknown[] };
    const count = Number(data.result?.[0] ?? 1);

    if (count <= maxRequests) {
      return { allowed: true, remaining: maxRequests - count, retryAfterMs: 0 };
    }

    const retryAfterMs = windowMs - (Date.now() % windowMs);
    return { allowed: false, remaining: 0, retryAfterMs };
  } catch (err) {
    console.warn("[rateLimit] Upstash fallback to memory:", err);
    return checkRateLimit(identifier, options);
  }
}

/** Rate limit with optional Upstash Redis when UPSTASH_REDIS_REST_* is configured. */
export async function checkRateLimitAsync(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    return upstashRateLimit(identifier, options);
  }
  return checkRateLimit(identifier, options);
}
