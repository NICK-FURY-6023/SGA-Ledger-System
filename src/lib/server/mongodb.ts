import { MongoClient, Db, Collection } from 'mongodb';

// ─── MongoDB Atlas Connection ───
// Free tier (M0): 512MB storage, shared cluster — perfect for status/monitoring data
// Keeps Firestore clean for ledger-only data

let client: MongoClient | null = null;
let db: Db | null = null;

export function isMongoConfigured(): boolean {
  return !!process.env.MONGODB_URI;
}

export async function getMongo(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;
  if (db) return db;
  try {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'sgala_status');
    // TTL index: auto-delete entries older than 90 days
    await db.collection('uptime_history').createIndex(
      { checkedAtDate: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 }
    ).catch(() => {});
    await db.collection('service_status').createIndex(
      { checkedAtDate: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 }
    ).catch(() => {});
    return db;
  } catch (err) {
    console.error('[SGALA] MongoDB connection error:', err);
    return null;
  }
}

export async function pingMongo(): Promise<number> {
  const database = await getMongo();
  if (!database) return -1;
  const t0 = Date.now();
  await database.command({ ping: 1 });
  return Date.now() - t0;
}

// Get or create the persistent server start time (survives cold starts)
export async function getServerStartTime(): Promise<number | null> {
  const database = await getMongo();
  if (!database) return null;
  try {
    const col = database.collection('server_info');
    const doc = await col.findOne({ key: 'deployment' });
    if (doc) return doc.startedAt as number;
    // First ever health check — record deployment time
    const now = Date.now();
    await col.insertOne({ key: 'deployment', startedAt: now, createdAt: new Date(now) });
    return now;
  } catch (err) {
    console.error('[SGALA] MongoDB getServerStartTime error:', err);
    return null;
  }
}

// ─── UPTIME HISTORY ───

export type UptimeEntry = {
  time: string;
  status: 'up' | 'down' | 'degraded';
  latency: number;
  checkedAt: number;
  checkedAtDate?: Date;
};

const MAX_ENTRIES = 2000;

async function getUptimeCollection(): Promise<Collection<UptimeEntry> | null> {
  const database = await getMongo();
  if (!database) return null;
  return database.collection<UptimeEntry>('uptime_history');
}

export async function loadUptimeFromMongo(): Promise<UptimeEntry[]> {
  const col = await getUptimeCollection();
  if (!col) return [];
  try {
    return await col
      .find({})
      .sort({ checkedAt: -1 })
      .limit(MAX_ENTRIES)
      .toArray()
      .then(docs => docs.reverse().map(({ _id, ...rest }) => rest as unknown as UptimeEntry));
  } catch (err) {
    console.error('[SGALA] MongoDB loadUptime error:', err);
    return [];
  }
}

export async function saveUptimeToMongo(entry: UptimeEntry): Promise<boolean> {
  const col = await getUptimeCollection();
  if (!col) return false;
  try {
    await col.insertOne({
      ...entry,
      checkedAtDate: new Date(entry.checkedAt),
    } as any);
    return true;
  } catch (err) {
    console.error('[SGALA] MongoDB saveUptime error:', err);
    return false;
  }
}

// Get total uptime stats from ALL history (not just current session)
export async function getUptimeStats(): Promise<{
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  degradedChecks: number;
  uptimePercent: number;
  monitoringSince: number | null;
  lastDownAt: number | null;
  onlineSince: number | null;
  avgLatency: number;
}> {
  const col = await getUptimeCollection();
  const empty = { totalChecks: 0, upChecks: 0, downChecks: 0, degradedChecks: 0, uptimePercent: 100, monitoringSince: null, lastDownAt: null, onlineSince: null, avgLatency: 0 };
  if (!col) return empty;
  try {
    const agg = await col.aggregate([{
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        upChecks: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
        downChecks: { $sum: { $cond: [{ $eq: ['$status', 'down'] }, 1, 0] } },
        degradedChecks: { $sum: { $cond: [{ $eq: ['$status', 'degraded'] }, 1, 0] } },
        firstCheck: { $min: '$checkedAt' },
        avgLatency: { $avg: '$latency' },
      }
    }]).toArray();
    if (agg.length === 0) return empty;
    const s = agg[0];

    // Last down event
    const lastDownDoc = await col.find({ status: 'down' }).sort({ checkedAt: -1 }).limit(1).toArray();
    const lastDownAt = lastDownDoc.length > 0 ? lastDownDoc[0].checkedAt : null;

    // "Online since": first 'up' after last non-up entry
    let onlineSince: number | null = null;
    const lastNonUp = await col.find({ status: { $ne: 'up' } }).sort({ checkedAt: -1 }).limit(1).toArray();
    if (lastNonUp.length > 0) {
      const firstUpAfter = await col.find({ status: 'up', checkedAt: { $gt: lastNonUp[0].checkedAt } }).sort({ checkedAt: 1 }).limit(1).toArray();
      onlineSince = firstUpAfter.length > 0 ? firstUpAfter[0].checkedAt : null;
    } else {
      onlineSince = s.firstCheck;
    }

    return {
      totalChecks: s.totalChecks,
      upChecks: s.upChecks,
      downChecks: s.downChecks,
      degradedChecks: s.degradedChecks,
      uptimePercent: s.totalChecks > 0 ? Math.round((s.upChecks / s.totalChecks) * 100) : 100,
      monitoringSince: s.firstCheck,
      lastDownAt,
      onlineSince,
      avgLatency: Math.round(s.avgLatency || 0),
    };
  } catch (err) {
    console.error('[SGALA] MongoDB getUptimeStats error:', err);
    return empty;
  }
}

// ─── PER-SERVICE STATUS TRACKING ───

export type ServiceEvent = {
  service: string;
  status: string;
  latency: number;
  checkedAt: number;
  checkedAtDate: Date;
};

// Save per-service status snapshot
export async function saveServiceStatuses(services: { name: string; status: string; latency: number }[]): Promise<void> {
  const database = await getMongo();
  if (!database) return;
  try {
    const col = database.collection('service_status');
    const now = Date.now();
    const docs = services.map(s => ({
      service: s.name,
      status: s.status,
      latency: s.latency,
      checkedAt: now,
      checkedAtDate: new Date(now),
    }));
    await col.insertMany(docs);
  } catch (err) {
    console.error('[SGALA] MongoDB saveServiceStatuses error:', err);
  }
}

// Get per-service timeline (firstSeen, lastDown, onlineSince, uptime%)
export async function getServiceTimelines(): Promise<Record<string, {
  firstSeen: number | null;
  lastDown: number | null;
  onlineSince: number | null;
  totalChecks: number;
  upChecks: number;
}>> {
  const database = await getMongo();
  if (!database) return {};
  try {
    const col = database.collection<ServiceEvent>('service_status');
    const UP_STATUSES = ['operational', 'connected', 'ok', 'up', 'in-memory'];
    const serviceNames = ['api', 'firestore', 'mongodb', 'redis', 'auth', 'audit'];
    const result: Record<string, { firstSeen: number | null; lastDown: number | null; onlineSince: number | null; totalChecks: number; upChecks: number }> = {};

    for (const svc of serviceNames) {
      const agg = await col.aggregate([
        { $match: { service: svc } },
        {
          $group: {
            _id: null,
            firstSeen: { $min: '$checkedAt' },
            totalChecks: { $sum: 1 },
            upChecks: { $sum: { $cond: [{ $in: ['$status', UP_STATUSES] }, 1, 0] } },
          }
        }
      ]).toArray();

      if (agg.length === 0) {
        result[svc] = { firstSeen: null, lastDown: null, onlineSince: null, totalChecks: 0, upChecks: 0 };
        continue;
      }

      const lastDown = await col.find({
        service: svc, status: { $nin: UP_STATUSES }
      }).sort({ checkedAt: -1 }).limit(1).toArray();

      let onlineSince: number | null = null;
      if (lastDown.length > 0) {
        const firstUpAfter = await col.find({
          service: svc, status: { $in: UP_STATUSES }, checkedAt: { $gt: lastDown[0].checkedAt }
        }).sort({ checkedAt: 1 }).limit(1).toArray();
        onlineSince = firstUpAfter.length > 0 ? firstUpAfter[0].checkedAt : null;
      } else {
        onlineSince = agg[0].firstSeen;
      }

      result[svc] = {
        firstSeen: agg[0].firstSeen,
        lastDown: lastDown.length > 0 ? lastDown[0].checkedAt : null,
        onlineSince,
        totalChecks: agg[0].totalChecks,
        upChecks: agg[0].upChecks,
      };
    }
    return result;
  } catch (err) {
    console.error('[SGALA] MongoDB getServiceTimelines error:', err);
    return {};
  }
}
