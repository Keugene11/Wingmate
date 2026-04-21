import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Per-endpoint sliding-window limiter. Reused so hitting one endpoint doesn't
// exhaust a neighboring endpoint's budget.
const cache = new Map<string, Ratelimit>();

function getLimiter(key: string, limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!redis) return null;
  let rl = cache.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rl:${key}`,
      analytics: true,
    });
    cache.set(key, rl);
  }
  return rl;
}

/**
 * Check rate limit for a userId on a named bucket. Returns true if the request
 * should be allowed. If Redis is unavailable, requests are allowed (fail-open
 * — we don't want a Redis outage to lock users out).
 */
export async function checkRateLimit(
  bucket: string,
  userId: string,
  limit: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`
): Promise<boolean> {
  const limiter = getLimiter(bucket, limit, window);
  if (!limiter) return true;
  const { success } = await limiter.limit(userId);
  return success;
}
