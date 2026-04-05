import { getRedis, isUpstashConfigured } from './upstash';

// ─── GENERIC REDIS CACHE LAYER ───
// All reads go through Redis first → Firestore only on cache miss
// This makes the app significantly faster and saves Firestore quota

const PREFIX = 'sgala:';

// Get value from cache (returns null on miss or if Redis not configured)
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isUpstashConfigured()) return null;
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get<T>(`${PREFIX}${key}`);
    return val ?? null;
  } catch (err) {
    console.error('[SGALA] Cache GET error:', err);
    return null;
  }
}

// Set value in cache with TTL (seconds)
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isUpstashConfigured()) return;
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`${PREFIX}${key}`, value, { ex: ttlSeconds });
  } catch (err) {
    console.error('[SGALA] Cache SET error:', err);
  }
}

// Delete one or more cache keys
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!isUpstashConfigured() || keys.length === 0) return;
  const r = getRedis();
  if (!r) return;
  try {
    const fullKeys = keys.map(k => `${PREFIX}${k}`);
    await r.del(...fullKeys);
  } catch (err) {
    console.error('[SGALA] Cache DEL error:', err);
  }
}

// Delete all keys matching a pattern (e.g., "party:abc*")
// Uses SCAN to avoid blocking — safe for production
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!isUpstashConfigured()) return;
  const r = getRedis();
  if (!r) return;
  try {
    let cursor = 0;
    do {
      const result = await r.scan(cursor, { match: `${PREFIX}${pattern}`, count: 100 });
      cursor = Number(result[0]);
      const keys = result[1] as string[];
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.error('[SGALA] Cache DEL pattern error:', err);
  }
}

// Cache-through helper: check cache → if miss, fetch from source → store in cache
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Cache miss → fetch from source (Firestore/memory)
  const data = await fetcher();

  // Store in cache (don't await — fire and forget for speed)
  if (data !== null && data !== undefined) {
    cacheSet(key, data, ttlSeconds).catch(() => {});
  }

  return data;
}

// ─── CACHE KEY BUILDERS ───
// Centralized key management for easy invalidation

export const CacheKeys = {
  // Admin
  adminById: (id: string) => `admin:${id}`,
  adminByEmail: (email: string) => `admin:email:${email.toLowerCase()}`,

  // Settings
  settings: () => 'settings',

  // System stats
  stats: () => 'stats',

  // Parties
  partyById: (id: string) => `party:${id}`,
  partyList: () => 'parties:list',

  // Ledger pages
  pageById: (id: string) => `page:${id}`,
  partyPages: (partyId: string) => `party:${partyId}:pages`,

  // Page transactions
  pageTxns: (pageId: string) => `page:${pageId}:txns`,

  // Transactions (main ledger)
  txnList: () => 'txns:list',
} as const;

// ─── TTL VALUES (seconds) ───
export const CacheTTL = {
  ADMIN: 300,        // 5 minutes — admins rarely change
  SETTINGS: 600,     // 10 minutes — settings change very rarely
  STATS: 120,        // 2 minutes — dashboard stats
  PARTY: 120,        // 2 minutes — party data
  PARTY_LIST: 60,    // 1 minute — party list
  PAGES: 60,         // 1 minute — ledger pages list
  PAGE: 120,         // 2 minutes — single page
  PAGE_TXNS: 30,     // 30 seconds — page transactions (changes frequently)
  TXN_LIST: 30,      // 30 seconds — main ledger transactions
} as const;
