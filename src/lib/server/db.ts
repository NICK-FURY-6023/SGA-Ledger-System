import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb, isFirebaseConfigured, markFirebaseUnavailable } from './firebase';
import { getStore, Admin, Session, Transaction, AuditLog, Settings, Party, LedgerPage } from './store';

function useFirestore(): boolean {
  return isFirebaseConfigured() && !!getDb();
}

function handleFirestoreError(context: string, err: unknown): void {
  console.error(`[SGALA] Firestore error in ${context}:`, err);
  markFirebaseUnavailable();
}

// ─── ADMIN OPERATIONS ───

export async function seedAdmins(): Promise<void> {
  if (useFirestore()) {
    try {
      const db = getDb()!;
      const snapshot = await db.collection('admins').limit(1).get();
      if (!snapshot.empty) return;

      const adminHash = await bcrypt.hash('SGALAS.@ADMIN123', 12);
      const devHash = await bcrypt.hash('SGALA@DEVLOPER_Xd', 12);
      const batch = db.batch();

      const adminId = uuidv4();
      batch.set(db.collection('admins').doc(adminId), {
        id: adminId,
        email: 'sgalas@admin.com',
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      });

      const devId = uuidv4();
    batch.set(db.collection('admins').doc(devId), {
      id: devId,
      email: 'sgalas@devloper.com',
      username: 'developer',
      passwordHash: devHash,
      role: 'superadmin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    await batch.commit();
    } catch (err) {
      handleFirestoreError('seedAdmins', err);
      const { seedAdmin } = await import('./store');
      await seedAdmin();
    }
  } else {
    const { seedAdmin } = await import('./store');
    await seedAdmin();
  }
}

export async function findAdminByEmail(email: string): Promise<Admin | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const snapshot = await db.collection('admins')
      .where('email', '==', email.toLowerCase())
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Admin;
  } else {
    const store = getStore();
    return store.admins.find(a => a.email === email.toLowerCase() && a.isActive) || null;
  }
}

export async function findAdminById(id: string): Promise<Admin | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.collection('admins').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Admin;
  } else {
    const store = getStore();
    return store.admins.find(a => a.id === id) || null;
  }
}

export async function updateAdmin(id: string, data: Partial<Admin>): Promise<void> {
  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('admins').doc(id).update(data);
  } else {
    const store = getStore();
    const admin = store.admins.find(a => a.id === id);
    if (admin) Object.assign(admin, data);
  }
}

// ─── SESSION OPERATIONS ───

export async function createSession(data: Omit<Session, 'id'>): Promise<Session> {
  const session: Session = { id: uuidv4(), ...data };
  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('sessions').doc(session.id).set(session);
  } else {
    const store = getStore();
    store.sessions.push(session);
  }
  return session;
}

export async function updateSession(id: string, data: Partial<Session>): Promise<void> {
  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('sessions').doc(id).update(data);
  } else {
    const store = getStore();
    const session = store.sessions.find(s => s.id === id);
    if (session) Object.assign(session, data);
  }
}

// ─── TRANSACTION OPERATIONS ───

async function recalculateBalancesFirestore(): Promise<void> {
  const db = getDb()!;
  const snapshot = await db.collection('transactions')
    .orderBy('date', 'asc')
    .orderBy('createdAt', 'asc')
    .get();

  if (snapshot.empty) return;

  let prevBalance = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const t = doc.data();
    const newBalance = prevBalance + (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
    if (t.balance !== newBalance) {
      batch.update(doc.ref, { balance: newBalance });
      batchCount++;
    }
    prevBalance = newBalance;

    // Firestore batch limit is 500
    if (batchCount >= 499) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}

function recalculateBalancesMemory(): void {
  const store = getStore();
  store.transactions.sort((a, b) => {
    const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComp !== 0) return dateComp;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  for (let i = 0; i < store.transactions.length; i++) {
    const t = store.transactions[i];
    const prev = i === 0 ? 0 : store.transactions[i - 1].balance;
    t.balance = prev + (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
  }
}

export async function recalculateAllBalances(): Promise<void> {
  if (useFirestore()) {
    await recalculateBalancesFirestore();
  } else {
    recalculateBalancesMemory();
  }
}

interface TransactionFilters {
  billNo?: string | null;
  partyName?: string | null;
  type?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sortOrder?: string | null;
  page?: number;
  limit?: number;
}

export async function getAllTransactions(filters: TransactionFilters) {
  const { billNo, partyName, type, dateFrom, dateTo, sortOrder, page = 1, limit = 50 } = filters;

  if (useFirestore()) {
    const db = getDb()!;
    let query: FirebaseFirestore.Query = db.collection('transactions');

    if (type) query = query.where('type', '==', type);
    if (dateFrom) query = query.where('date', '>=', dateFrom);
    if (dateTo) query = query.where('date', '<=', dateTo);

    query = query.orderBy('date', sortOrder === 'newest' ? 'desc' : 'asc');

    const snapshot = await query.get();
    let transactions = snapshot.docs.map(d => d.data() as Transaction);

    // Client-side filtering for text search (Firestore doesn't support LIKE)
    if (billNo) transactions = transactions.filter(t => t.billNo.toLowerCase().includes(billNo.toLowerCase()));
    if (partyName) transactions = transactions.filter(t => t.partyName?.toLowerCase().includes(partyName.toLowerCase()));

    const total = transactions.length;
    const start = (page - 1) * limit;
    const paginated = transactions.slice(start, start + limit);

    return { transactions: paginated, total, page, totalPages: Math.ceil(total / limit) };
  } else {
    const store = getStore();
    let transactions = [...store.transactions];

    if (billNo) transactions = transactions.filter(t => t.billNo.toLowerCase().includes(billNo.toLowerCase()));
    if (partyName) transactions = transactions.filter(t => t.partyName?.toLowerCase().includes(partyName.toLowerCase()));
    if (type) transactions = transactions.filter(t => t.type === type);
    if (dateFrom) transactions = transactions.filter(t => new Date(t.date) >= new Date(dateFrom));
    if (dateTo) transactions = transactions.filter(t => new Date(t.date) <= new Date(dateTo));
    if (sortOrder === 'newest') transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = transactions.length;
    const start = (page - 1) * limit;
    const paginated = transactions.slice(start, start + limit);

    return { transactions: paginated, total, page, totalPages: Math.ceil(total / limit) };
  }
}

export async function createTransaction(data: {
  date: string; partyName?: string; billNo: string; folio?: string;
  debit: number; credit: number; sr: number; type: 'CIR' | 'DIR' | 'SR';
  adminId: string;
}): Promise<Transaction> {
  const transaction: Transaction = {
    id: uuidv4(),
    date: data.date,
    partyName: data.partyName?.trim() || '',
    billNo: data.billNo.trim(),
    folio: data.folio || '',
    debit: data.debit,
    credit: data.credit,
    sr: data.sr,
    type: data.type,
    balance: 0,
    createdBy: data.adminId,
    updatedBy: data.adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('transactions').doc(transaction.id).set(transaction);
    await recalculateBalancesFirestore();
    const doc = await db.collection('transactions').doc(transaction.id).get();
    return doc.data() as Transaction;
  } else {
    const store = getStore();
    store.transactions.push(transaction);
    recalculateBalancesMemory();
    return store.transactions.find(t => t.id === transaction.id)!;
  }
}

export async function findTransactionById(id: string): Promise<Transaction | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.collection('transactions').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Transaction;
  } else {
    const store = getStore();
    return store.transactions.find(t => t.id === id) || null;
  }
}

export async function updateTransaction(id: string, data: {
  date?: string; partyName?: string; billNo?: string; folio?: string;
  debit: number; credit: number; sr: number; type?: string;
  adminId: string;
}): Promise<Transaction | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const docRef = db.collection('transactions').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const existing = doc.data() as Transaction;
    const updated = {
      ...existing,
      date: data.date || existing.date,
      partyName: data.partyName !== undefined ? (data.partyName?.trim() ?? '') : existing.partyName,
      billNo: data.billNo?.trim() || existing.billNo,
      folio: data.folio !== undefined ? data.folio : existing.folio,
      debit: data.debit,
      credit: data.credit,
      sr: data.sr,
      type: data.type || existing.type,
      updatedBy: data.adminId,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(updated);
    await recalculateBalancesFirestore();
    const refreshed = await docRef.get();
    return refreshed.data() as Transaction;
  } else {
    const store = getStore();
    const index = store.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    const existing = store.transactions[index];
    store.transactions[index] = {
      ...existing,
      date: data.date || existing.date,
      partyName: data.partyName !== undefined ? (data.partyName?.trim() ?? '') : existing.partyName,
      billNo: data.billNo?.trim() || existing.billNo,
      folio: data.folio !== undefined ? data.folio : existing.folio,
      debit: data.debit,
      credit: data.credit,
      sr: data.sr,
      type: (data.type || existing.type) as 'CIR' | 'DIR' | 'SR',
      updatedBy: data.adminId,
      updatedAt: new Date().toISOString(),
    };
    recalculateBalancesMemory();
    return store.transactions.find(t => t.id === id)!;
  }
}

export async function deleteTransaction(id: string): Promise<Transaction | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const docRef = db.collection('transactions').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const deleted = doc.data() as Transaction;
    await docRef.delete();
    await recalculateBalancesFirestore();
    return deleted;
  } else {
    const store = getStore();
    const index = store.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    const deleted = store.transactions[index];
    store.transactions.splice(index, 1);
    recalculateBalancesMemory();
    return deleted;
  }
}

// ─── AUDIT LOG OPERATIONS ───

export async function createAuditLog(input: {
  adminId?: string; actionType: string; actionDetails?: string;
  targetId?: string | null; ipAddress?: string; deviceInfo?: string;
  sessionId?: string | null;
}): Promise<AuditLog> {
  const log: AuditLog = {
    id: uuidv4(),
    adminId: input.adminId || 'system',
    actionType: input.actionType,
    actionDetails: input.actionDetails || '',
    targetId: input.targetId || null,
    ipAddress: input.ipAddress || 'unknown',
    deviceInfo: input.deviceInfo || 'unknown',
    sessionId: input.sessionId || null,
    timestamp: new Date().toISOString(),
  };

  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('audit_logs').doc(log.id).set(log);
  } else {
    const store = getStore();
    store.audit_logs.unshift(log);
  }

  return log;
}

export async function getAuditLogs(params: {
  adminId?: string; from?: string; to?: string; page?: number; limit?: number;
}) {
  const { adminId, from, to, page = 1, limit = 50 } = params;

  if (useFirestore()) {
    const db = getDb()!;
    let query: FirebaseFirestore.Query = db.collection('audit_logs')
      .orderBy('timestamp', 'desc');

    if (adminId) query = query.where('adminId', '==', adminId);
    if (from) query = query.where('timestamp', '>=', from);
    if (to) query = query.where('timestamp', '<=', to);

    const snapshot = await query.get();
    const allLogs = snapshot.docs.map(d => d.data() as AuditLog);
    const total = allLogs.length;
    const start = (page - 1) * limit;
    const paginated = allLogs.slice(start, start + limit);

    return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
  } else {
    const store = getStore();
    let logs = [...store.audit_logs];

    if (adminId) logs = logs.filter(l => l.adminId === adminId);
    if (from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(from));
    if (to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(to));

    const total = logs.length;
    const start = (page - 1) * limit;
    const paginated = logs.slice(start, start + limit);

    return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
  }
}

// ─── SETTINGS OPERATIONS ───

const SETTINGS_DOC = 'config/settings';

export async function getSettings(): Promise<Settings> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.doc(SETTINGS_DOC).get();
    if (!doc.exists) {
      const defaults: Settings = {
        shopName: 'Shree Ganpati Agency',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        sortOrder: 'newest',
      };
      await db.doc(SETTINGS_DOC).set(defaults);
      return defaults;
    }
    return doc.data() as Settings;
  } else {
    const store = getStore();
    return store.settings;
  }
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.doc(SETTINGS_DOC).get();
    const current = doc.exists ? (doc.data() as Settings) : {
      shopName: 'Shree Ganpati Agency', currency: 'INR',
      dateFormat: 'DD/MM/YYYY', sortOrder: 'newest',
    };

    const updated = { ...current, ...data };
    await db.doc(SETTINGS_DOC).set(updated);
    return updated;
  } else {
    const store = getStore();
    if (data.shopName) store.settings.shopName = data.shopName;
    if (data.currency) store.settings.currency = data.currency;
    if (data.dateFormat) store.settings.dateFormat = data.dateFormat;
    if (data.sortOrder) store.settings.sortOrder = data.sortOrder;
    return store.settings;
  }
}

// ─── PARTY (KHATA) OPERATIONS ───

export async function createParty(data: {
  name: string; phone?: string; address?: string; notes?: string; adminId: string;
}): Promise<Party> {
  const party: Party = {
    id: uuidv4(),
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    address: data.address?.trim() || '',
    notes: data.notes?.trim() || '',
    isActive: true,
    createdBy: data.adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('parties').doc(party.id).set(party);
  } else {
    const store = getStore();
    store.parties.push(party);
  }
  return party;
}

export async function getAllParties(filters?: { search?: string; page?: number; limit?: number }) {
  const { search, page = 1, limit = 50 } = filters || {};

  if (useFirestore()) {
    const db = getDb()!;
    const snapshot = await db.collection('parties').where('isActive', '==', true).get();
    let parties = snapshot.docs.map(d => d.data() as Party);
    parties.sort((a, b) => a.name.localeCompare(b.name));
    if (search) parties = parties.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
    );

    const partiesWithStats = await Promise.all(parties.map(async (p) => {
      const txSnap = await db.collection('transactions').where('partyId', '==', p.id).get();
      const pageSnap = await db.collection('ledger_pages').where('partyId', '==', p.id).get();
      const txs = txSnap.docs.map(d => d.data());
      return {
        ...p,
        totalPages: pageSnap.size,
        totalTransactions: txSnap.size,
        totalDebit: txs.reduce((s, t) => s + (t.debit || 0), 0),
        totalCredit: txs.reduce((s, t) => s + (t.credit || 0), 0),
        totalSR: txs.reduce((s, t) => s + (t.sr || 0), 0),
        balance: txs.reduce((s, t) => s + (t.credit || 0) + (t.sr || 0) - (t.debit || 0), 0),
        lastActivity: txs.length > 0 ? txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt : p.createdAt,
      };
    }));

    const total = partiesWithStats.length;
    const start = (page - 1) * limit;
    return { parties: partiesWithStats.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit) };
  } else {
    const store = getStore();
    let parties = store.parties.filter(p => p.isActive);
    if (search) parties = parties.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
    );
    parties.sort((a, b) => a.name.localeCompare(b.name));

    const partiesWithStats = parties.map(p => {
      const txs = store.transactions.filter(t => t.partyId === p.id);
      const pages = store.ledger_pages.filter(lp => lp.partyId === p.id);
      return {
        ...p,
        totalPages: pages.length,
        totalTransactions: txs.length,
        totalDebit: txs.reduce((s, t) => s + (t.debit || 0), 0),
        totalCredit: txs.reduce((s, t) => s + (t.credit || 0), 0),
        totalSR: txs.reduce((s, t) => s + (t.sr || 0), 0),
        balance: txs.reduce((s, t) => s + (t.credit || 0) + (t.sr || 0) - (t.debit || 0), 0),
        lastActivity: txs.length > 0 ? txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt : p.createdAt,
      };
    });

    const total = partiesWithStats.length;
    const start = (page - 1) * limit;
    return { parties: partiesWithStats.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit) };
  }
}

export async function getPartyById(id: string): Promise<Party | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.collection('parties').doc(id).get();
    if (!doc.exists || !(doc.data() as Party).isActive) return null;
    return doc.data() as Party;
  } else {
    const store = getStore();
    return store.parties.find(p => p.id === id && p.isActive) || null;
  }
}

export async function updateParty(id: string, data: Partial<Pick<Party, 'name' | 'phone' | 'address' | 'notes'>>): Promise<Party | null> {
  const updates = { ...data, updatedAt: new Date().toISOString() };
  if (useFirestore()) {
    const db = getDb()!;
    const docRef = db.collection('parties').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    await docRef.update(updates);
    const refreshed = await docRef.get();
    return refreshed.data() as Party;
  } else {
    const store = getStore();
    const party = store.parties.find(p => p.id === id);
    if (!party) return null;
    Object.assign(party, updates);
    return party;
  }
}

export async function deleteParty(id: string): Promise<boolean> {
  if (useFirestore()) {
    const db = getDb()!;
    const docRef = db.collection('parties').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.update({ isActive: false, updatedAt: new Date().toISOString() });
    return true;
  } else {
    const store = getStore();
    const party = store.parties.find(p => p.id === id);
    if (!party) return false;
    party.isActive = false;
    party.updatedAt = new Date().toISOString();
    return true;
  }
}

// ─── LEDGER PAGE OPERATIONS ───

export async function createLedgerPage(data: {
  partyId: string; title?: string; openingBalance?: number; adminId: string;
}): Promise<LedgerPage> {
  let pageNumber = 1;
  if (useFirestore()) {
    const db = getDb()!;
    const snap = await db.collection('ledger_pages').where('partyId', '==', data.partyId).get();
    if (!snap.empty) {
      const nums = snap.docs.map(d => (d.data() as LedgerPage).pageNumber);
      pageNumber = Math.max(...nums) + 1;
    }
  } else {
    const store = getStore();
    const existing = store.ledger_pages.filter(p => p.partyId === data.partyId);
    if (existing.length > 0) pageNumber = Math.max(...existing.map(p => p.pageNumber)) + 1;
  }

  const lp: LedgerPage = {
    id: uuidv4(),
    partyId: data.partyId,
    pageNumber,
    title: data.title?.trim() || `Page ${pageNumber}`,
    status: 'open',
    openingBalance: data.openingBalance || 0,
    createdBy: data.adminId,
    createdAt: new Date().toISOString(),
    closedAt: null,
  };

  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('ledger_pages').doc(lp.id).set(lp);
  } else {
    const store = getStore();
    store.ledger_pages.push(lp);
  }
  return lp;
}

export async function getPartyPages(partyId: string) {
  if (useFirestore()) {
    const db = getDb()!;
    const snap = await db.collection('ledger_pages').where('partyId', '==', partyId).get();
    const pages = snap.docs.map(d => d.data() as LedgerPage);
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    return await Promise.all(pages.map(async (p) => {
      const txSnap = await db.collection('transactions').where('pageId', '==', p.id).get();
      const txs = txSnap.docs.map(d => d.data());
      const totalDebit = txs.reduce((s, t) => s + (t.debit || 0), 0);
      const totalCredit = txs.reduce((s, t) => s + (t.credit || 0), 0);
      const totalSR = txs.reduce((s, t) => s + (t.sr || 0), 0);
      return {
        ...p,
        transactionCount: txSnap.size,
        totalDebit, totalCredit, totalSR,
        closingBalance: p.openingBalance + totalCredit + totalSR - totalDebit,
      };
    }));
  } else {
    const store = getStore();
    const pages = store.ledger_pages.filter(p => p.partyId === partyId);
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    return pages.map(p => {
      const txs = store.transactions.filter(t => t.pageId === p.id);
      const totalDebit = txs.reduce((s, t) => s + (t.debit || 0), 0);
      const totalCredit = txs.reduce((s, t) => s + (t.credit || 0), 0);
      const totalSR = txs.reduce((s, t) => s + (t.sr || 0), 0);
      return {
        ...p,
        transactionCount: txs.length,
        totalDebit, totalCredit, totalSR,
        closingBalance: p.openingBalance + totalCredit + totalSR - totalDebit,
      };
    });
  }
}

export async function getLedgerPageById(pageId: string): Promise<LedgerPage | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const doc = await db.collection('ledger_pages').doc(pageId).get();
    if (!doc.exists) return null;
    return doc.data() as LedgerPage;
  } else {
    const store = getStore();
    return store.ledger_pages.find(p => p.id === pageId) || null;
  }
}

export async function getPageTransactions(pageId: string, filters?: { page?: number; limit?: number }) {
  const { page = 1, limit = 50 } = filters || {};

  if (useFirestore()) {
    const db = getDb()!;
    const snap = await db.collection('transactions')
      .where('pageId', '==', pageId)
      .orderBy('date', 'asc')
      .orderBy('createdAt', 'asc')
      .get();
    const transactions = snap.docs.map(d => d.data() as Transaction);

    const pageDoc = await db.collection('ledger_pages').doc(pageId).get();
    const lp = pageDoc.data() as LedgerPage;
    let running = lp?.openingBalance || 0;
    const withBalance = transactions.map(t => {
      running += (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
      return { ...t, pageBalance: running };
    });

    const total = withBalance.length;
    const start = (page - 1) * limit;
    return { transactions: withBalance.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit), openingBalance: lp?.openingBalance || 0 };
  } else {
    const store = getStore();
    const txs = store.transactions.filter(t => t.pageId === pageId);
    txs.sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return d !== 0 ? d : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const lp = store.ledger_pages.find(p => p.id === pageId);
    let running = lp?.openingBalance || 0;
    const withBalance = txs.map(t => {
      running += (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
      return { ...t, pageBalance: running };
    });

    const total = withBalance.length;
    const start = (page - 1) * limit;
    return { transactions: withBalance.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit), openingBalance: lp?.openingBalance || 0 };
  }
}

export async function closeLedgerPage(pageId: string): Promise<LedgerPage | null> {
  if (useFirestore()) {
    const db = getDb()!;
    const docRef = db.collection('ledger_pages').doc(pageId);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const updated = { ...doc.data() as LedgerPage, status: 'closed' as const, closedAt: new Date().toISOString() };
    await docRef.set(updated);
    return updated;
  } else {
    const store = getStore();
    const p = store.ledger_pages.find(lp => lp.id === pageId);
    if (!p) return null;
    p.status = 'closed';
    p.closedAt = new Date().toISOString();
    return p;
  }
}

export async function createPageTransaction(data: {
  pageId: string; partyId: string; date: string; partyName: string;
  billNo: string; folio?: string; debit: number; credit: number;
  sr: number; type: 'CIR' | 'DIR' | 'SR'; adminId: string;
}): Promise<Transaction> {
  const tx: Transaction = {
    id: uuidv4(),
    date: data.date,
    partyName: data.partyName.trim(),
    billNo: data.billNo.trim(),
    folio: data.folio || '',
    debit: data.debit,
    credit: data.credit,
    sr: data.sr,
    type: data.type,
    balance: 0,
    partyId: data.partyId,
    pageId: data.pageId,
    createdBy: data.adminId,
    updatedBy: data.adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (useFirestore()) {
    const db = getDb()!;
    await db.collection('transactions').doc(tx.id).set(tx);
    await recalculateBalancesFirestore();
    const doc = await db.collection('transactions').doc(tx.id).get();
    return doc.data() as Transaction;
  } else {
    const store = getStore();
    store.transactions.push(tx);
    recalculateBalancesMemory();
    return store.transactions.find(t => t.id === tx.id)!;
  }
}

// ─── HEALTH / STATS OPERATIONS ───

export async function getSystemStats() {
  if (useFirestore()) {
    const db = getDb()!;
    const [txSnap, partySnap, pageSnap, auditSnap, adminSnap] = await Promise.all([
      db.collection('transactions').get(),
      db.collection('parties').where('isActive', '==', true).get(),
      db.collection('ledger_pages').get(),
      db.collection('audit_logs').get(),
      db.collection('admins').where('isActive', '==', true).get(),
    ]);
    return {
      totalTransactions: txSnap.size,
      totalParties: partySnap.size,
      totalPages: pageSnap.size,
      totalAuditLogs: auditSnap.size,
      totalAdmins: adminSnap.size,
      database: 'firestore' as const,
    };
  } else {
    const store = getStore();
    return {
      totalTransactions: store.transactions.length,
      totalParties: store.parties.filter(p => p.isActive).length,
      totalPages: store.ledger_pages.length,
      totalAuditLogs: store.audit_logs.length,
      totalAdmins: store.admins.filter(a => a.isActive).length,
      database: 'in-memory' as const,
    };
  }
}

// ─── BACKUP / EXPORT ───

export async function getFullBackup() {
  if (useFirestore()) {
    const db = getDb()!;
    const [txSnap, partySnap, pageSnap, auditSnap] = await Promise.all([
      db.collection('transactions').get(),
      db.collection('parties').where('isActive', '==', true).get(),
      db.collection('ledger_pages').get(),
      db.collection('audit_logs').orderBy('timestamp', 'desc').limit(500).get(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      database: 'firestore',
      parties: partySnap.docs.map(d => d.data()),
      ledgerPages: pageSnap.docs.map(d => d.data()),
      transactions: txSnap.docs.map(d => d.data()),
      auditLogs: auditSnap.docs.map(d => d.data()),
    };
  } else {
    const store = getStore();
    return {
      exportedAt: new Date().toISOString(),
      database: 'in-memory',
      parties: store.parties.filter(p => p.isActive),
      ledgerPages: store.ledger_pages,
      transactions: store.transactions,
      auditLogs: store.audit_logs.slice(-500),
    };
  }
}

export async function getPartyBackup(partyId: string) {
  const party = await getPartyById(partyId);
  if (!party) return null;

  if (useFirestore()) {
    const db = getDb()!;
    const [pageSnap, txSnap] = await Promise.all([
      db.collection('ledger_pages').where('partyId', '==', partyId).get(),
      db.collection('transactions').where('partyId', '==', partyId).get(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      database: 'firestore',
      party,
      ledgerPages: pageSnap.docs.map(d => d.data()),
      transactions: txSnap.docs.map(d => d.data()),
    };
  } else {
    const store = getStore();
    return {
      exportedAt: new Date().toISOString(),
      database: 'in-memory',
      party,
      ledgerPages: store.ledger_pages.filter(p => p.partyId === partyId),
      transactions: store.transactions.filter(t => t.partyId === partyId),
    };
  }
}
