/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP with a sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  maxRequests?: number;   // Max requests per window (default: 60)
  windowMs?: number;      // Window size in ms (default: 60000 = 1 min)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { maxRequests = 60, windowMs = 60000 } = options;
  const now = Date.now();

  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
  }

  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: entry.resetAt - now,
  };
}

/**
 * Extract IP from request headers.
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
