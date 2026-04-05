import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured, getDb } from '@/lib/server/firebase';
import { getSystemStats } from '@/lib/server/db';
import { isUpstashConfigured, getRedis, loadUptimeFromRedis, saveUptimeToRedis, UptimeEntry } from '@/lib/server/upstash';

const startTime = Date.now();

// Uptime storage: Upstash Redis (primary) → Firestore (fallback)
// Upstash free tier: 10K commands/day — uptime uses ~6K/day at 30s interval
// This keeps Firestore free for ledger data only

async function loadUptimeHistory(): Promise<UptimeEntry[]> {
  // Primary: Upstash Redis
  if (isUpstashConfigured()) {
    return loadUptimeFromRedis();
  }
  // Fallback: Firestore (if Redis not configured yet)
  if (isFirebaseConfigured() && getDb()) {
    try {
      const db = getDb()!;
      const snap = await db.collection('uptime_history')
        .orderBy('checkedAt', 'desc')
        .limit(1000)
        .get();
      const entries = snap.docs.map(d => d.data() as UptimeEntry);
      return entries.reverse();
    } catch {
      return [];
    }
  }
  return [];
}

async function saveUptimeEntry(entry: UptimeEntry) {
  // Primary: Upstash Redis
  if (isUpstashConfigured()) {
    await saveUptimeToRedis(entry);
    return;
  }
  // Fallback: Firestore (if Redis not configured yet)
  if (isFirebaseConfigured() && getDb()) {
    try {
      await getDb()!.collection('uptime_history').add(entry);
    } catch (err) {
      console.error('[SGALA] Failed to save uptime entry:', err);
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memUsage = process.memoryUsage();

  // Detect visitor info from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  const base = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isFirebaseConfigured() ? 'firestore' : 'in-memory',
    uptime,
    startedAt: new Date(startTime).toISOString(),
  };

  // DB health check
  let dbLatency = -1;
  let dbStatus = 'unknown';
  try {
    if (isFirebaseConfigured() && getDb()) {
      const t0 = Date.now();
      await getDb()!.collection('admins').limit(1).get();
      dbLatency = Date.now() - t0;
      dbStatus = 'connected';
    } else {
      dbLatency = 0;
      dbStatus = 'in-memory';
    }
  } catch {
    dbStatus = 'error';
  }

  // Redis cache health check
  let redisLatency = -1;
  let redisStatus = 'not-configured';
  if (isUpstashConfigured()) {
    try {
      const r = getRedis();
      if (r) {
        const t0 = Date.now();
        await r.ping();
        redisLatency = Date.now() - t0;
        redisStatus = 'connected';
      }
    } catch {
      redisStatus = 'error';
    }
  }

  // Create uptime entry and save to Firestore
  const entryStatus: 'up' | 'down' | 'degraded' =
    dbStatus === 'error' ? 'down' : dbLatency > 500 ? 'degraded' : 'up';
  const newEntry = {
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    status: entryStatus,
    latency: dbLatency,
    checkedAt: Date.now(),
  };
  await saveUptimeEntry(newEntry);

  // Load full history from Firestore (persistent!)
  const uptimeLog = await loadUptimeHistory();

  // Uptime percentage from persistent log
  const checksUp = uptimeLog.filter(u => u.status === 'up').length;
  const uptimePercent = uptimeLog.length > 0 ? Math.round((checksUp / uptimeLog.length) * 100) : 100;

  if (!detailed) {
    return NextResponse.json({
      ...base,
      services: {
        api: { status: 'operational', uptime },
        database: { status: dbStatus, latency: dbLatency, type: base.database },
        cache: { status: redisStatus, latency: redisLatency, type: 'upstash-redis' },
        auth: { status: 'operational' },
        audit: { status: 'operational' },
      },
      uptimePercent,
      uptimeHistory: uptimeLog.slice(-60),
      visitor: { ip, userAgent },
    });
  }

  // Detailed health for developer monitor
  let stats;
  try { stats = await getSystemStats(); } catch { stats = null; }

  const endpoints = [
    { name: 'Health', path: '/api/health', status: 'operational' },
    { name: 'Auth', path: '/api/auth/me', status: 'operational' },
    { name: 'Transactions', path: '/api/transactions', status: 'operational' },
    { name: 'Audit Logs', path: '/api/audit-logs', status: 'operational' },
    { name: 'Settings', path: '/api/settings', status: 'operational' },
    { name: 'Parties', path: '/api/parties', status: 'operational' },
  ];

  return NextResponse.json({
    ...base,
    services: {
      api: { status: 'operational', uptime },
      database: { status: dbStatus, latency: dbLatency, type: base.database },
      cache: { status: redisStatus, latency: redisLatency, type: 'upstash-redis' },
      auth: { status: 'operational' },
      audit: { status: 'operational' },
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    stats,
    endpoints,
    uptimePercent,
    uptimeHistory: uptimeLog.slice(-60),
    visitor: { ip, userAgent },
    nodeVersion: process.version,
    platform: process.platform,
  });
}
