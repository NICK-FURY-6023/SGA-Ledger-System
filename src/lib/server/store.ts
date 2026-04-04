import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface Admin {
  id: string;
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

interface Store {
  admins: Admin[];
  sessions: Session[];
  transactions: Transaction[];
  audit_logs: AuditLog[];
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

export async function seedAdmin() {
  const store = getStore();
  if (store._seeded) return;
  store._seeded = true;

  const hash = await bcrypt.hash('admin123', 12);
  store.admins.push({
    id: uuidv4(),
    username: 'admin',
    passwordHash: hash,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });
}

// Auto-seed on import
seedAdmin();
