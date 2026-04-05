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
    // Create TTL index on uptime_history for automatic cleanup (90 days)
    await db.collection('uptime_history').createIndex(
      { checkedAt: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 }
    ).catch(() => {});
    return db;
  } catch (err) {
    console.error('[SGALA] MongoDB connection error:', err);
    return null;
  }
}

// Ping MongoDB to check health
export async function pingMongo(): Promise<number> {
  const database = await getMongo();
  if (!database) return -1;
  const t0 = Date.now();
  await database.command({ ping: 1 });
  return Date.now() - t0;
}

// ─── UPTIME HISTORY ───

export type UptimeEntry = {
  time: string;
  status: 'up' | 'down' | 'degraded';
  latency: number;
  checkedAt: number;
};

const MAX_ENTRIES = 2000;

async function getUptimeCollection(): Promise<Collection<UptimeEntry> | null> {
  const database = await getMongo();
  if (!database) return null;
  return database.collection<UptimeEntry>('uptime_history');
}

// Load uptime history from MongoDB (sorted by checkedAt ascending)
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

// Save uptime entry to MongoDB
export async function saveUptimeToMongo(entry: UptimeEntry): Promise<boolean> {
  const col = await getUptimeCollection();
  if (!col) return false;
  try {
    await col.insertOne({ ...entry, checkedAt: entry.checkedAt } as any);
    return true;
  } catch (err) {
    console.error('[SGALA] MongoDB saveUptime error:', err);
    return false;
  }
}
