import { Redis } from '@upstash/redis';

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

// Uptime history key
const UPTIME_KEY = 'sgala:uptime_history';
const MAX_ENTRIES = 1000;
const CLEANUP_INTERVAL = 50;
let writesSinceCleanup = 0;

export type UptimeEntry = {
  time: string;
  status: 'up' | 'down' | 'degraded';
  latency: number;
  checkedAt: number;
};

// Load uptime history from Upstash Redis (sorted set, scored by checkedAt)
export async function loadUptimeFromRedis(): Promise<UptimeEntry[]> {
  const r = getRedis();
  if (!r) return [];
  try {
    // ZRANGE with BYSCORE returns oldest→newest
    const raw = await r.zrange<UptimeEntry[]>(UPTIME_KEY, 0, -1);
    return raw || [];
  } catch (err) {
    console.error('[SGALA] Redis loadUptime error:', err);
    return [];
  }
}

// Save uptime entry to Upstash Redis sorted set
export async function saveUptimeToRedis(entry: UptimeEntry): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    // Add to sorted set with checkedAt as score (Upstash auto-serializes objects)
    await r.zadd(UPTIME_KEY, { score: entry.checkedAt, member: entry });

    writesSinceCleanup++;
    if (writesSinceCleanup >= CLEANUP_INTERVAL) {
      writesSinceCleanup = 0;
      // Trim to keep only last MAX_ENTRIES
      const count = await r.zcard(UPTIME_KEY);
      if (count > MAX_ENTRIES) {
        // Remove oldest entries (lowest scores)
        await r.zremrangebyrank(UPTIME_KEY, 0, count - MAX_ENTRIES - 1);
      }
    }
    return true;
  } catch (err) {
    console.error('[SGALA] Redis saveUptime error:', err);
    return false;
  }
}
