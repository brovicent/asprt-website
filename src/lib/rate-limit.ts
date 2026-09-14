/**
 * Simple in-memory rate limiter using a sliding window.
 * Works for single-process Node.js (Next.js dev & standalone production).
 * For multi-instance deployments, replace with Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

// Global map: key → { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  /** Remaining allowed attempts in the current window */
  remaining: number;
  /** Seconds until the window resets */
  retryAfter: number;
}

/**
 * Check and increment a rate limit counter.
 *
 * @param key       Unique identifier, e.g. `login:${ip}`
 * @param limit     Maximum allowed requests in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    retryAfter: 0,
  };
}

/**
 * Extract the best-effort client IP from a Next.js request.
 * Falls back to "unknown" if no IP can be determined.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for can be a comma-separated list; first is the client IP
    return xff.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
