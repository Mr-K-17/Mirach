import { ApiError } from "./errors.ts";

interface WindowBucket {
  count: number;
  resetAt: number;
}

// In-worker in-memory LRU-like sliding window for fast local throttling (zero subrequests)
const memoryBuckets = new Map<string, WindowBucket>();

/**
 * Checks in-memory sliding window rate limit.
 *
 * @param key Unique rate-limiting key (e.g. `ip:${clientIp}:action` or `user:${userId}:action`)
 * @param maxRequests Maximum allowed requests in the time window
 * @param windowMs Duration of the window in milliseconds
 */
export function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): void {
  const bucket = memoryBuckets.get(key);

  if (!bucket || nowMs >= bucket.resetAt) {
    memoryBuckets.set(key, {
      count: 1,
      resetAt: nowMs + windowMs
    });
    return;
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - nowMs) / 1000);
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Too many requests. Please retry in ${retryAfterSeconds} seconds.`
    );
  }

  bucket.count += 1;
}

/**
 * Periodically cleans up expired rate-limiting buckets to prevent memory leaks.
 */
export function cleanupMemoryBuckets(nowMs: number = Date.now()): void {
  if (memoryBuckets.size < 500) return;
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (nowMs >= bucket.resetAt) {
      memoryBuckets.delete(key);
    }
  }
}
