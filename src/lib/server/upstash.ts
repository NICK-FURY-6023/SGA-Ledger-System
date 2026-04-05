import { Redis } from '@upstash/redis';

// ─── Upstash Redis Connection ───
// Used ONLY for caching (cache.ts). Uptime data is stored in MongoDB.

let redis: Redis | null = null;

export function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis | null {
  if (!isUpstashConfigured()) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}
