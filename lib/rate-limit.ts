import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Rate limiter for /api/v1/calculate. No-op when Upstash env vars are missing. */
export async function rateLimitCalculate(identifier: string): Promise<{ success: boolean; remaining: number }> {
  if (!redisUrl || !redisToken) {
    return { success: true, remaining: 999 };
  }
  const redis = new Redis({ url: redisUrl, token: redisToken });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "rl:calculate",
  });
  const { success, remaining } = await ratelimit.limit(identifier);
  return { success, remaining };
}
