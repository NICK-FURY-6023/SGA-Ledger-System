import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured, getDb } from '@/lib/server/firebase';
import { getSystemStats } from '@/lib/server/db';

const startTime = Date.now();
const MAX_UPTIME_LOG = 90;

// Load uptime history from Firestore (persistent across cold starts)
async function loadUptimeHistory(): Promise<{ time: string; status: 'up' | 'down' | 'degraded'; latency: number; checkedAt: number }[]> {
  if (isFirebaseConfigured() && getDb()) {
    try {
      const db = getDb()!;
      const snap = await db.collection('uptime_history')
        .orderBy('checkedAt', 'desc')
        .limit(MAX_UPTIME_LOG)
        .get();
      const entries = snap.docs.map(d => d.data() as { time: string; status: 'up' | 'down' | 'degraded'; latency: number; checkedAt: number });
      return entries.reverse();
    } catch {
      return [];
    }
  }
  return [];
}

// Save a single uptime entry to Firestore
async function saveUptimeEntry(entry: { time: string; status: 'up' | 'down' | 'degraded'; latency: number; checkedAt: number }) {
  if (isFirebaseConfigured() && getDb()) {
    try {
      const db = getDb()!;
      await db.collection('uptime_history').add(entry);

      // Cleanup: keep only last MAX_UPTIME_LOG entries
      const countSnap = await db.collection('uptime_history').orderBy('checkedAt', 'asc').get();
      if (countSnap.size > MAX_UPTIME_LOG) {
        const toDelete = countSnap.docs.slice(0, countSnap.size - MAX_UPTIME_LOG);
        const batch = db.batch();
        toDelete.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
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
