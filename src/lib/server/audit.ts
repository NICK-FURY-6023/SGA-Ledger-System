import { v4 as uuidv4 } from 'uuid';
import { getStore, AuditLog } from './store';

interface AuditInput {
  adminId?: string;
  actionType: string;
  actionDetails?: string;
  targetId?: string | null;
  ipAddress?: string;
  deviceInfo?: string;
  sessionId?: string | null;
}

export function createAuditLog(input: AuditInput): AuditLog {
  const store = getStore();
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
  store.audit_logs.unshift(log);
  return log;
}

export function getAuditLogs(params: {
  adminId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const store = getStore();
  const { adminId, from, to, page = 1, limit = 50 } = params;

  let logs = [...store.audit_logs];

  if (adminId) logs = logs.filter(l => l.adminId === adminId);
  if (from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(from));
  if (to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(to));

  const total = logs.length;
  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
}
