import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface Admin {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  adminId: string;
  loginTime: string;
  logoutTime: string | null;
  duration: number | null;
  ipAddress: string;
  deviceInfo: string;
}

export interface Transaction {
  id: string;
  date: string;
  partyName: string;
  billNo: string;
  folio: string;
  debit: number;
  credit: number;
  sr: number;
  type: 'CIR' | 'DIR' | 'SR';
  balance: number;
  partyId?: string;
  pageId?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  actionType: string;
  actionDetails: string;
  targetId: string | null;
  ipAddress: string;
  deviceInfo: string;
  sessionId: string | null;
  timestamp: string;
}

export interface Settings {
  shopName: string;
  currency: string;
  dateFormat: string;
  sortOrder: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerPage {
  id: string;
  partyId: string;
  pageNumber: number;
  title: string;
  status: 'open' | 'closed';
  openingBalance: number;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
}

interface Store {
  admins: Admin[];
  sessions: Session[];
  transactions: Transaction[];
  audit_logs: AuditLog[];
  parties: Party[];
  ledger_pages: LedgerPage[];
  settings: Settings;
  _seeded: boolean;
}

// Global store that persists across API route invocations in dev
const globalStore = globalThis as unknown as { __sgaStore?: Store };

function createStore(): Store {
  return {
    admins: [],
    sessions: [],
    transactions: [],
    audit_logs: [],
    parties: [],
    ledger_pages: [],
    settings: {
      shopName: 'Shree Ganpati Agency',
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      sortOrder: 'newest',
    },
    _seeded: false,
  };
}

export function getStore(): Store {
  if (!globalStore.__sgaStore) {
    globalStore.__sgaStore = createStore();
  }
  return globalStore.__sgaStore;
}

let _seedPromise: Promise<void> | null = null;

export async function seedAdmin() {
  const store = getStore();
  if (store._seeded) return;
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    const adminHash = await bcrypt.hash('SGALAS.@ADMIN123', 12);
    store.admins.push({
      id: uuidv4(),
      email: 'sgalas@admin.com',
      username: 'admin',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    const devHash = await bcrypt.hash('SGALA@DEVLOPER_Xd', 12);
    store.admins.push({
      id: uuidv4(),
      email: 'sgalas@devloper.com',
      username: 'developer',
      passwordHash: devHash,
      role: 'superadmin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    store._seeded = true;
  })();

  return _seedPromise;
}

// Auto-seed on import
seedAdmin();
