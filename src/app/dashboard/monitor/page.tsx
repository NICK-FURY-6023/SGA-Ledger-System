'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { auditAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { IconMonitor, IconDatabase, IconServer, IconActivity, IconCheckCircle, IconAlertTriangle, IconRefresh, IconShield, IconUsers } from '@/components/icons/Icons';

interface HealthData {
  status: string;
  timestamp: string;
  database: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  actionType: string;
  actionDetails: string;
  ipAddress: string;
  timestamp: string;
}

export default function MonitorPage() {
  const { admin } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [recentLogins, setRecentLogins] = useState<AuditLog[]>([]);
  const [recentErrors, setRecentErrors] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, logsRes] = await Promise.all([
        fetch('/api/health').then(r => r.json()),
        auditAPI.getAll({ limit: '100' }),
      ]);

      setHealth(healthRes);

      const logs: AuditLog[] = logsRes.logs || [];
      setAllLogs(logs);
      setRecentLogins(logs.filter((l: AuditLog) => l.actionType === 'LOGIN' || l.actionType === 'LOGOUT').slice(0, 10));
      setRecentErrors(logs.filter((l: AuditLog) => l.actionType === 'LOGIN_FAILED' || l.actionType === 'ACCESS_DENIED').slice(0, 10));
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      console.error('Failed to load monitor data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalLogins = allLogs.filter(l => l.actionType === 'LOGIN').length;
  const totalFailed = allLogs.filter(l => l.actionType === 'LOGIN_FAILED').length;
  const totalActions = allLogs.length;

  return (
    <div>
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconMonitor size={22} /> System Monitor</h1>
          <p className="main__subtitle">Real-time system health and activity</p>
        </div>
        <button
          className="ledger__filter-btn"
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <IconRefresh size={14} /> {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* System Status Cards */}
      <div className="stats">
        <div className="stat-card">
          <div className="stat-card__label"><IconServer size={14} /> Server Status</div>
          <div className="stat-card__value" style={{ fontSize: '1rem' }}>
            {health?.status === 'ok' ? (
              <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconCheckCircle size={18} color="#4CAF50" /> Online
              </span>
            ) : (
              <span style={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconAlertTriangle size={18} color="#f44336" /> Offline
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><IconDatabase size={14} /> Database</div>
          <div className="stat-card__value" style={{ fontSize: '1rem' }}>
            {health?.database === 'firestore' ? (
              <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconCheckCircle size={18} color="#4CAF50" /> Firestore
              </span>
            ) : (
              <span style={{ color: '#FF9800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconAlertTriangle size={18} color="#FF9800" /> In-Memory
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><IconUsers size={14} /> Total Logins</div>
          <div className="stat-card__value stat-card__value--blue">{totalLogins}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><IconShield size={14} /> Failed Attempts</div>
          <div className="stat-card__value" style={{ color: totalFailed > 0 ? '#f44336' : '#4CAF50' }}>
            {totalFailed}
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <IconActivity size={16} /> Activity Summary
        </h3>
        <div className="stats">
          <div className="stat-card">
            <div className="stat-card__label">Total Audit Events</div>
            <div className="stat-card__value stat-card__value--blue">{totalActions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Logged In As</div>
            <div className="stat-card__value" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>
              {admin?.email}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Last Refresh</div>
            <div className="stat-card__value" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {lastRefresh || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Login Sessions */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <IconUsers size={16} /> Recent Login Sessions
        </h3>
        <div className="audit__table-wrap">
          <table className="audit__table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {recentLogins.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No login sessions recorded yet
                  </td>
                </tr>
              ) : (
                recentLogins.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</td>
                    <td>
                      <span className={`audit__action-badge audit__action-badge--${log.actionType}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.actionDetails}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{log.ipAddress}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Alerts */}
      {recentErrors.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#f44336', marginBottom: '1rem' }}>
            <IconAlertTriangle size={16} color="#f44336" /> Security Alerts
          </h3>
          <div className="audit__table-wrap">
            <table className="audit__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((log) => (
                  <tr key={log.id} style={{ background: 'rgba(244, 67, 54, 0.05)' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(244,67,54,0.15)', color: '#f44336' }}>
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.actionDetails}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
