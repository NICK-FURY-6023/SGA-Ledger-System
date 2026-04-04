const { v4: uuidv4 } = require('uuid');
const { store } = require('./memoryStore');

async function createAuditLog({ adminId, actionType, actionDetails, targetId, ipAddress, deviceInfo, sessionId }) {
  const log = {
    id: uuidv4(),
    adminId: adminId || 'system',
    actionType,
    actionDetails: actionDetails || '',
    targetId: targetId || null,
    ipAddress: ipAddress || 'unknown',
    deviceInfo: deviceInfo || 'unknown',
    sessionId: sessionId || null,
    timestamp: new Date().toISOString(),
  };
  store.audit_logs.unshift(log);
  return log;
}

function getAuditLogs({ adminId, from, to, page = 1, limit = 50 } = {}) {
  let logs = [...store.audit_logs];

  if (adminId) {
    logs = logs.filter(l => l.adminId === adminId);
  }
  if (from) {
    logs = logs.filter(l => new Date(l.timestamp) >= new Date(from));
  }
  if (to) {
    logs = logs.filter(l => new Date(l.timestamp) <= new Date(to));
  }

  const total = logs.length;
  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = { createAuditLog, getAuditLogs };
