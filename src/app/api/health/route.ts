import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured, getDb } from '@/lib/server/firebase';
import { getSystemStats } from '@/lib/server/db';

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memUsage = process.memoryUsage();

  const base = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isFirebaseConfigured() ? 'firestore' : 'in-memory',
    uptime,
  };

  if (!detailed) return NextResponse.json(base);

  // Detailed health for developer monitor
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

  let stats;
  try { stats = await getSystemStats(); } catch { stats = null; }

  // Check API endpoints
  const endpoints = [
    { name: 'Auth', path: '/api/auth/me' },
    { name: 'Transactions', path: '/api/transactions' },
    { name: 'Audit Logs', path: '/api/audit-logs' },
    { name: 'Settings', path: '/api/settings' },
    { name: 'Parties', path: '/api/parties' },
  ];

  return NextResponse.json({
    ...base,
    services: {
      api: { status: 'operational', uptime },
      database: { status: dbStatus, latency: dbLatency, type: base.database },
      auth: { status: 'operational' },
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    stats,
    endpoints: endpoints.map(e => ({ ...e, status: 'operational' })),
    nodeVersion: process.version,
    platform: process.platform,
  });
}
