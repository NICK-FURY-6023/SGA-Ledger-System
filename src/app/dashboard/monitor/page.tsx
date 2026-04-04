'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { auditAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  IconMonitor, IconDatabase, IconServer, IconActivity, IconCheckCircle,
  IconAlertTriangle, IconRefresh, IconShield, IconUsers, IconClock,
  IconGlobe, IconZap, IconCpu, IconHeart, IconWifi
} from '@/components/icons/Icons';

interface HealthData {
  status: string;
  timestamp: string;
  database: string;
  uptime: number;
  services?: {
    api: { status: string; uptime: number };
    database: { status: string; latency: number; type: string };
    auth: { status: string };
  };
  memory?: { rss: number; heapUsed: number; heapTotal: number; external: number };
  stats?: {
    totalTransactions: number; totalParties: number; totalPages: number;
    totalAuditLogs: number; totalAdmins: number; database: string;
  };
  endpoints?: { name: string; path: string; status: string }[];
  nodeVersion?: string;
  platform?: string;
}

interface AuditLog {
  id: string; adminId: string; actionType: string;
  actionDetails: string; ipAddress: string; timestamp: string;
}

interface UptimeEntry { time: string; status: 'up' | 'down' | 'degraded'; latency: number }

export default function MonitorPage() {
  const { admin } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [recentLogins, setRecentLogins] = useState<AuditLog[]>([]);
  const [recentErrors, setRecentErrors] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [uptimeHistory, setUptimeHistory] = useState<UptimeEntry[]>([]);
  const [apiLatency, setApiLatency] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      const t0 = Date.now();
      const [healthRes, logsRes] = await Promise.all([
        fetch('/api/health?detailed=true').then(r => r.json()),
        auditAPI.getAll({ limit: '100' }),
      ]);
      setApiLatency(Date.now() - t0);
      setHealth(healthRes);

      const logs: AuditLog[] = logsRes.logs || [];
      setAllLogs(logs);
      setRecentLogins(logs.filter((l: AuditLog) => l.actionType === 'LOGIN' || l.actionType === 'LOGOUT').slice(0, 10));
      setRecentErrors(logs.filter((l: AuditLog) => l.actionType === 'LOGIN_FAILED' || l.actionType === 'ACCESS_DENIED').slice(0, 10));
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      setUptimeHistory(prev => {
        const entry: UptimeEntry = {
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          status: healthRes.status === 'ok' ? 'up' : 'down',
          latency: healthRes.services?.database?.latency || 0,
        };
        const updated = [...prev, entry];
        return updated.slice(-30);
      });
    } catch (err) {
      console.error('Health check failed:', err);
      setUptimeHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), status: 'down' as const, latency: 0 }].slice(-30));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'operational' || status === 'connected' || status === 'ok' || status === 'up') return '#00C853';
    if (status === 'degraded' || status === 'in-memory') return '#FF9800';
    return '#FF3D00';
  };

  const totalLogins = allLogs.filter(l => l.actionType === 'LOGIN').length;
  const totalFailed = allLogs.filter(l => l.actionType === 'LOGIN_FAILED').length;
  const uptimePercent = uptimeHistory.length > 0
    ? Math.round((uptimeHistory.filter(u => u.status === 'up').length / uptimeHistory.length) * 100)
    : 100;

  const cardStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '1.2rem',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem',
    display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600,
  };

  return (
    <div>
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconMonitor size={22} /> Health Monitor</h1>
          <p className="main__subtitle">
            Real-time system health & performance
            {autoRefresh && <span style={{ color: 'var(--success)', marginLeft: '0.6rem', fontSize: '0.75rem' }}>
              <IconWifi size={12} /> LIVE
            </span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
              background: autoRefresh ? 'rgba(0,200,83,0.15)' : 'rgba(255,61,0,0.15)',
              color: autoRefresh ? '#00C853' : '#FF3D00', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600,
            }}
          >
            {autoRefresh ? <><IconCheckCircle size={13} /> Auto</> : <><IconAlertTriangle size={13} /> Paused</>}
          </button>
          <button className="ledger__filter-btn" onClick={loadData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconRefresh size={14} /> {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div style={{
        ...cardStyle, marginBottom: '1.5rem',
        borderColor: health?.status === 'ok' ? 'rgba(0,200,83,0.3)' : 'rgba(255,61,0,0.3)',
        background: health?.status === 'ok' ? 'rgba(0,200,83,0.05)' : 'rgba(255,61,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: health?.status === 'ok' ? '#00C853' : '#FF3D00',
            boxShadow: `0 0 12px ${health?.status === 'ok' ? '#00C853' : '#FF3D00'}`,
            animation: 'pulse 2s infinite',
          }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: health?.status === 'ok' ? '#00C853' : '#FF3D00' }}>
              {health?.status === 'ok' ? 'All Systems Operational' : 'System Issues Detected'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Last checked: {lastRefresh || '—'} | Uptime: {health?.uptime ? formatUptime(health.uptime) : '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>UPTIME</div>
            <div style={{ color: uptimePercent >= 99 ? '#00C853' : '#FF9800', fontWeight: 700, fontSize: '1.3rem' }}>{uptimePercent}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>LATENCY</div>
            <div style={{ color: apiLatency < 500 ? '#00C853' : '#FF9800', fontWeight: 700, fontSize: '1.3rem' }}>{apiLatency}ms</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>DB</div>
            <div style={{ color: getStatusColor(health?.services?.database?.status || ''), fontWeight: 700, fontSize: '1.3rem' }}>
              {health?.services?.database?.latency ?? '—'}ms
            </div>
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <div style={sectionTitle}><IconServer size={16} /> Services</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { name: 'API Server', icon: <IconGlobe size={18} />, status: health?.services?.api?.status || 'checking', detail: health?.uptime ? formatUptime(health.uptime) : '—' },
          { name: 'Database', icon: <IconDatabase size={18} />, status: health?.services?.database?.status || 'checking', detail: `${health?.services?.database?.type || '—'} (${health?.services?.database?.latency ?? '—'}ms)` },
          { name: 'Authentication', icon: <IconShield size={18} />, status: health?.services?.auth?.status || 'checking', detail: `${totalLogins} sessions` },
          { name: 'Audit System', icon: <IconActivity size={18} />, status: 'operational', detail: `${allLogs.length} events` },
        ].map((svc) => (
          <div key={svc.name} style={{
            ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem',
            borderColor: `${getStatusColor(svc.status)}25`,
          }}>
            <div style={{ color: getStatusColor(svc.status) }}>{svc.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{svc.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{svc.detail}</div>
            </div>
            <div style={{
              padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
              background: `${getStatusColor(svc.status)}18`, color: getStatusColor(svc.status),
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {svc.status}
            </div>
          </div>
        ))}
      </div>

      {/* Uptime History Timeline */}
      <div style={sectionTitle}><IconHeart size={16} /> Uptime History (Last {uptimeHistory.length} checks)</div>
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '50px', padding: '0 4px' }}>
          {uptimeHistory.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', width: '100%', textAlign: 'center', paddingTop: '15px' }}>
              Collecting data... checks run every 30s
            </div>
          ) : (
            uptimeHistory.map((entry, i) => (
              <div key={i} title={`${entry.time} — ${entry.status} (${entry.latency}ms)`} style={{
                flex: 1, minWidth: 6, maxWidth: 20, height: '100%',
                borderRadius: '2px 2px 0 0',
                background: entry.status === 'up'
                  ? entry.latency < 200 ? '#00C853' : entry.latency < 500 ? '#7CB342' : '#FF9800'
                  : '#FF3D00',
                opacity: 0.85,
                transition: 'opacity 0.2s',
                cursor: 'pointer',
              }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.85'; }}
              />
            ))
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <span>{uptimeHistory[0]?.time || '—'}</span>
          <span style={{ display: 'flex', gap: '12px' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#00C853', marginRight: 3 }}/>Good</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#FF9800', marginRight: 3 }}/>Slow</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#FF3D00', marginRight: 3 }}/>Down</span>
          </span>
          <span>{uptimeHistory[uptimeHistory.length - 1]?.time || '—'}</span>
        </div>
      </div>

      {/* API Endpoints Status */}
      {health?.endpoints && (
        <>
          <div style={sectionTitle}><IconZap size={16} /> API Endpoints</div>
          <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endpoint</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Path</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {health.endpoints.map((ep) => (
                  <tr key={ep.path} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ep.name}</td>
                    <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{ep.path}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        background: 'rgba(0,200,83,0.15)', color: '#00C853',
                      }}>OPERATIONAL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* System Resources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Memory Usage */}
        {health?.memory && (
          <div style={cardStyle}>
            <div style={{ ...sectionTitle, marginBottom: '0.8rem' }}><IconCpu size={16} /> Memory Usage</div>
            {[
              { label: 'Heap Used', value: health.memory.heapUsed, max: health.memory.heapTotal, unit: 'MB' },
              { label: 'RSS', value: health.memory.rss, max: 512, unit: 'MB' },
              { label: 'External', value: health.memory.external, max: 100, unit: 'MB' },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.value} / {m.max} {m.unit}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
                    width: `${Math.min((m.value / m.max) * 100, 100)}%`,
                    background: (m.value / m.max) < 0.6 ? '#00C853' : (m.value / m.max) < 0.85 ? '#FF9800' : '#FF3D00',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data Stats */}
        {health?.stats && (
          <div style={cardStyle}>
            <div style={{ ...sectionTitle, marginBottom: '0.8rem' }}><IconDatabase size={16} /> Data Overview</div>
            {[
              { label: 'Transactions', value: health.stats.totalTransactions },
              { label: 'Parties / Customers', value: health.stats.totalParties },
              { label: 'Ledger Pages', value: health.stats.totalPages },
              { label: 'Audit Events', value: health.stats.totalAuditLogs },
              { label: 'Admin Accounts', value: health.stats.totalAdmins },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue-light)', fontFamily: 'var(--font-mono)' }}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Node.js', value: health?.nodeVersion || '—', icon: <IconServer size={14} /> },
          { label: 'Platform', value: health?.platform || '—', icon: <IconCpu size={14} /> },
          { label: 'Database', value: health?.database || '—', icon: <IconDatabase size={14} /> },
          { label: 'Uptime', value: health?.uptime ? formatUptime(health.uptime) : '—', icon: <IconClock size={14} /> },
          { label: 'Logged In', value: admin?.email?.split('@')[0] || '—', icon: <IconUsers size={14} /> },
          { label: 'Last Check', value: lastRefresh || '—', icon: <IconRefresh size={14} /> },
        ].map((info) => (
          <div key={info.label} style={{
            ...cardStyle, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
          }}>
            <span style={{ color: 'var(--text-muted)' }}>{info.icon}</span>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{info.label}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{info.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Login Sessions */}
      <div style={sectionTitle}><IconUsers size={16} /> Recent Login Sessions</div>
      <div className="audit__table-wrap" style={{ marginBottom: '1.5rem' }}>
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

      {/* Security Alerts */}
      {recentErrors.length > 0 && (
        <>
          <div style={{ ...sectionTitle, color: '#FF3D00' }}>
            <IconAlertTriangle size={16} color="#FF3D00" /> Security Alerts
          </div>
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
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
