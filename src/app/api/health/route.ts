import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured, getDb } from '@/lib/server/firebase';
import { getSystemStats } from '@/lib/server/db';
import { isUpstashConfigured, getRedis } from '@/lib/server/upstash';
import { isMongoConfigured, pingMongo, loadUptimeFromMongo, saveUptimeToMongo, getUptimeStats, saveServiceStatuses, getServiceTimelines, UptimeEntry } from '@/lib/server/mongodb';

const startTime = Date.now();

// Architecture:
// MongoDB Atlas (free) → Status/uptime data (persistent, unlimited history)
// Firestore → Ledger/business data only
// Upstash Redis → Caching layer (speeds up reads)

async function loadUptimeHistory(): Promise<UptimeEntry[]> {
  if (isMongoConfigured()) {
    return loadUptimeFromMongo();
  }
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
  if (isMongoConfigured()) {
    await saveUptimeToMongo(entry);
    return;
  }
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

  // MongoDB health check
  let mongoLatency = -1;
  let mongoStatus = 'not-configured';
  if (isMongoConfigured()) {
    try {
      mongoLatency = await pingMongo();
      mongoStatus = mongoLatency >= 0 ? 'connected' : 'error';
    } catch {
      mongoStatus = 'error';
    }
  }

  // Save uptime entry
  const entryStatus: 'up' | 'down' | 'degraded' =
    dbStatus === 'error' ? 'down' : dbLatency > 500 ? 'degraded' : 'up';
  const newEntry = {
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    status: entryStatus,
    latency: dbLatency,
    checkedAt: Date.now(),
  };
  await saveUptimeEntry(newEntry);

  // Save per-service status to MongoDB
  if (isMongoConfigured()) {
    await saveServiceStatuses([
      { name: 'api', status: 'operational', latency: 0 },
      { name: 'firestore', status: dbStatus, latency: dbLatency },
      { name: 'mongodb', status: mongoStatus, latency: mongoLatency },
      { name: 'redis', status: redisStatus, latency: redisLatency },
      { name: 'auth', status: 'operational', latency: 0 },
      { name: 'audit', status: 'operational', latency: 0 },
    ]);
  }

  // Load full history
  const uptimeLog = await loadUptimeHistory();

  // Get aggregated stats from MongoDB (ALL history, not just current session)
  let globalStats = null;
  let serviceTimelines: Record<string, any> = {};
  if (isMongoConfigured()) {
    [globalStats, serviceTimelines] = await Promise.all([
      getUptimeStats(),
      getServiceTimelines(),
    ]);
  }

  // Uptime percentage — use MongoDB aggregated stats if available, else compute from log
  const uptimePercent = globalStats
    ? globalStats.uptimePercent
    : (uptimeLog.length > 0 ? Math.round((uptimeLog.filter(u => u.status === 'up').length / uptimeLog.length) * 100) : 100);

  const responseData = {
    ...base,
    services: {
      api: { status: 'operational', uptime },
      database: { status: dbStatus, latency: dbLatency, type: base.database },
      mongodb: { status: mongoStatus, latency: mongoLatency, type: 'mongodb-atlas' },
      cache: { status: redisStatus, latency: redisLatency, type: 'upstash-redis' },
      auth: { status: 'operational' },
      audit: { status: 'operational' },
    },
    uptimePercent,
    uptimeHistory: uptimeLog.slice(-90),
    visitor: { ip, userAgent },
    // Global monitoring data from MongoDB
    monitoring: globalStats ? {
      monitoringSince: globalStats.monitoringSince,
      totalChecks: globalStats.totalChecks,
      upChecks: globalStats.upChecks,
      downChecks: globalStats.downChecks,
      degradedChecks: globalStats.degradedChecks,
      lastDownAt: globalStats.lastDownAt,
      onlineSince: globalStats.onlineSince,
      avgLatency: globalStats.avgLatency,
    } : null,
    serviceTimelines,
  };

  if (!detailed) {
    return NextResponse.json(responseData);
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
    ...responseData,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    stats,
    endpoints,
    nodeVersion: process.version,
    platform: process.platform,
  });
}
