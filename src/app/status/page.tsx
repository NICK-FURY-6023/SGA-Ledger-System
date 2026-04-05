'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Types ─── */
interface ServiceStatus {
  status: string;
  uptime?: number;
  latency?: number;
  type?: string;
}

interface UptimeEntry {
  time: string;
  status: 'up' | 'down' | 'degraded';
  latency: number;
  checkedAt: number;
}

interface HealthData {
  status: string;
  timestamp: string;
  database: string;
  uptime: number;
  startedAt: string;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    mongodb: ServiceStatus;
    cache: ServiceStatus;
    auth: ServiceStatus;
    audit: ServiceStatus;
  };
  uptimePercent: number;
  uptimeHistory: UptimeEntry[];
  visitor: { ip: string; userAgent: string };
}

interface GeoData {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  isp?: string;
  lat?: number;
  lon?: number;
}

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  screenRes: string;
  language: string;
  connection: string;
  cores: number;
  memory: string;
  touchScreen: boolean;
}

/* ─── Device Detection Utility ─── */
function detectDevice(ua: string): DeviceInfo {
  // Try modern User-Agent Client Hints API first (Chrome 90+)
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  let isMobileHint = false;

  if (typeof navigator !== 'undefined' && 'userAgentData' in navigator) {
    const uaData = (navigator as any).userAgentData;
    if (uaData) {
      // Brand detection from client hints
      const brands = uaData.brands || [];
      const chromeBrand = brands.find((b: any) => b.brand === 'Google Chrome' || b.brand === 'Chromium');
      const edgeBrand = brands.find((b: any) => b.brand === 'Microsoft Edge');
      const operaBrand = brands.find((b: any) => b.brand === 'Opera');

      if (edgeBrand) browser = `Edge ${edgeBrand.version}`;
      else if (operaBrand) browser = `Opera ${operaBrand.version}`;
      else if (chromeBrand) browser = `Chrome ${chromeBrand.version}`;

      if (uaData.platform) {
        const plat = uaData.platform;
        if (plat === 'Windows') os = 'Windows';
        else if (plat === 'macOS') os = 'macOS';
        else if (plat === 'Android') os = 'Android';
        else if (plat === 'iOS') os = 'iOS';
        else if (plat === 'Linux') os = 'Linux';
        else if (plat === 'Chrome OS') os = 'ChromeOS';
        else os = plat;
      }

      isMobileHint = uaData.mobile === true;
      if (isMobileHint) device = 'Mobile';
    }
  }

  // Fallback: classic User-Agent string parsing
  if (browser === 'Unknown') {
    if (ua.includes('Firefox/')) browser = 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera ' + (ua.match(/OPR\/([\d.]+)/)?.[1] || ua.match(/Opera\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('Edg/')) browser = 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('SamsungBrowser/')) browser = 'Samsung Browser ' + (ua.match(/SamsungBrowser\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('UCBrowser/')) browser = 'UC Browser ' + (ua.match(/UCBrowser\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('Safari/') && !ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1] || '');
    else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';
  }

  if (os === 'Unknown') {
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Windows NT')) os = 'Windows';
    else if (ua.includes('Mac OS X')) {
      const ver = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
      os = ver ? `macOS ${ver}` : 'macOS';
    }
    else if (ua.includes('CrOS')) os = 'ChromeOS';
    else if (ua.includes('Android')) os = 'Android ' + (ua.match(/Android ([\d.]+)/)?.[1] || '');
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS ' + (ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
    else if (ua.includes('Linux')) os = 'Linux';
  }

  // Device type detection
  if (!isMobileHint) {
    if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/.test(ua)) device = 'Mobile';
    else if (/iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/.test(ua)) device = 'Tablet';
  }

  // Client-side info (real values from browser APIs)
  const screenRes = typeof window !== 'undefined'
    ? `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio || 1}x`
    : '\u2014';
  const language = typeof navigator !== 'undefined' ? navigator.language : '\u2014';
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0;
  const memory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
    ? `${(navigator as any).deviceMemory} GB` : '\u2014';
  const touchScreen = typeof navigator !== 'undefined' ? navigator.maxTouchPoints > 0 : false;
  const onLine = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let connection = '\u2014';
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      const type = conn.effectiveType || '\u2014';
      const downlink = conn.downlink ? `${conn.downlink} Mbps` : '';
      const rtt = conn.rtt ? `${conn.rtt}ms RTT` : '';
      const parts = [type, downlink, rtt].filter(Boolean);
      connection = parts.join(' / ');
    }
  }

  if (!onLine) connection = 'Offline';

  return { browser, os, device, screenRes, language, connection, cores, memory, touchScreen };
}

/* ─── SVG Icons (inline, no emoji) ─── */
const SvgCheck = ({ size = 16, color = '#00C853' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SvgAlert = ({ size = 16, color = '#FF9800' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const SvgDown = ({ size = 16, color = '#FF3D00' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const SvgGlobe = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const SvgServer = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
);

const SvgMonitor = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const SvgMapPin = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const SvgRefresh = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const SvgArrowLeft = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const SvgDatabase = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const SvgZap = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const SvgLeaf = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const SvgShield = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const SvgActivity = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

/* ─── Tooltip Component ─── */
function Tooltip({ children, content, visible }: { children: React.ReactNode; content: React.ReactNode; visible: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
          padding: '10px 14px', minWidth: '180px', zIndex: 1000, pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: '0.75rem',
        }}>
          <div style={{
            position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: '10px', height: '10px', background: '#1a1a2e', borderRight: '1px solid rgba(255,255,255,0.12)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }} />
          {content}
        </div>
      )}
    </div>
  );
}

/* ─── Main Status Page ─── */
export default function StatusPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const [hoveredBar, setHoveredBar] = useState<{ svc: string; idx: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
      setLastRefresh(new Date().toLocaleTimeString('en-IN', {
        hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));

      // Detect device on client side
      if (!deviceInfo) {
        setDeviceInfo(detectDevice(navigator.userAgent));
      }

      // Fetch geolocation (only once)
      if (!geo) {
        try {
          const geoRes = await fetch('https://ipapi.co/json/');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            setGeo({
              city: geoData.city,
              region: geoData.region,
              country: geoData.country_name,
              timezone: geoData.timezone,
              isp: geoData.org,
              lat: geoData.latitude,
              lon: geoData.longitude,
            });
          }
        } catch { /* geolocation is optional */ }
      }
    } catch {
      // API down
      setHealth(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setLoading(false);
    }
  }, [geo, deviceInfo]);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadHealth, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadHealth]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusColor = (status: string) => {
    if (['operational', 'connected', 'ok', 'up'].includes(status)) return '#00C853';
    if (['degraded', 'in-memory', 'slow'].includes(status)) return '#FF9800';
    return '#FF3D00';
  };

  const getBarColor = (entry: UptimeEntry) => {
    if (entry.status === 'down') return '#FF3D00';
    if (entry.status === 'degraded') return '#FF9800';
    if (entry.latency < 100) return '#00C853';
    if (entry.latency < 300) return '#7CB342';
    if (entry.latency < 500) return '#FF9800';
    return '#FF6D00';
  };

  const overallOk = health?.status === 'ok';
  const uptimeHistory = health?.uptimeHistory || [];
  const uptimePercent = health?.uptimePercent ?? 100;

  const services = health ? [
    { key: 'api', name: 'API Server', icon: <SvgGlobe size={20} />, status: health.services.api.status, detail: `Uptime: ${formatUptime(health.uptime)}` },
    { key: 'database', name: 'Firestore', icon: <SvgDatabase size={20} />, status: health.services.database.status, detail: `${health.services.database.type} — ${health.services.database.latency}ms latency` },
    { key: 'mongodb', name: 'MongoDB Atlas', icon: <SvgLeaf size={20} />, status: health.services.mongodb?.status || 'not-configured', detail: (health.services.mongodb?.latency ?? -1) >= 0 ? `Status store — ${health.services.mongodb?.latency}ms latency` : 'Status store — not configured' },
    { key: 'cache', name: 'Redis Cache', icon: <SvgZap size={20} />, status: health.services.cache?.status || 'not-configured', detail: (health.services.cache?.latency ?? -1) >= 0 ? `Upstash Redis — ${health.services.cache?.latency}ms latency` : 'Upstash Redis — not configured' },
    { key: 'auth', name: 'Authentication', icon: <SvgShield size={20} />, status: health.services.auth.status, detail: 'JWT + bcrypt sessions' },
    { key: 'audit', name: 'Audit System', icon: <SvgActivity size={20} />, status: health.services.audit.status, detail: 'Event logging active' },
  ] : [];

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0F', color: '#E0E0E0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ─── Header ─── */}
      <header style={{
        padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              padding: '6px 12px', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.8rem', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,102,255,0.4)'; e.currentTarget.style.color = '#0066FF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#999'; }}
          >
            <SvgArrowLeft size={14} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/SGA.png" alt="SGALA" style={{ width: 28, height: 28 }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>SGALA</span>
            <span style={{ color: '#999', fontSize: '0.85rem' }}>/ System Status</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? 'rgba(0,200,83,0.1)' : 'rgba(255,61,0,0.1)',
              border: `1px solid ${autoRefresh ? 'rgba(0,200,83,0.3)' : 'rgba(255,61,0,0.3)'}`,
              borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600,
              color: autoRefresh ? '#00C853' : '#FF3D00', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: autoRefresh ? '#00C853' : '#FF3D00',
              animation: autoRefresh ? 'statusPulse 2s infinite' : 'none',
            }} />
            {autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={loadHealth}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', color: '#999',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <SvgRefresh size={12} /> {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* ─── Overall Status Banner ─── */}
        <div style={{
          textAlign: 'center', marginBottom: '3rem', padding: '2.5rem 2rem',
          background: overallOk ? 'rgba(0,200,83,0.04)' : 'rgba(255,61,0,0.04)',
          border: `1px solid ${overallOk ? 'rgba(0,200,83,0.15)' : 'rgba(255,61,0,0.15)'}`,
          borderRadius: '16px', minHeight: '180px',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
            background: overallOk ? 'rgba(0,200,83,0.12)' : 'rgba(255,61,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 30px ${overallOk ? 'rgba(0,200,83,0.3)' : 'rgba(255,61,0,0.3)'}`,
            animation: 'statusPulse 2s infinite',
          }}>
            {overallOk ? <SvgCheck size={28} /> : <SvgDown size={28} />}
          </div>
          <h1 style={{
            fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.4rem',
            color: overallOk ? '#00C853' : '#FF3D00',
          }}>
            {loading ? 'Checking Systems...' : overallOk ? 'All Systems Operational' : 'System Issues Detected'}
          </h1>
          <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
            Last checked: {lastRefresh || '—'}
            {health?.startedAt && ` | Running since: ${new Date(health.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>

        {/* ─── Quick Stats Row ─── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem',
        }}>
          {[
            { label: 'Uptime', value: `${uptimePercent}%`, color: uptimePercent >= 99 ? '#00C853' : uptimePercent >= 95 ? '#FF9800' : '#FF3D00' },
            { label: 'DB Latency', value: health?.services?.database?.latency !== undefined ? `${health.services.database.latency}ms` : '—', color: (health?.services?.database?.latency || 0) < 200 ? '#00C853' : '#FF9800' },
            { label: 'Cache Latency', value: (health?.services?.cache?.latency ?? -1) >= 0 ? `${health?.services?.cache?.latency}ms` : '—', color: (health?.services?.cache?.latency || 0) < 100 ? '#00C853' : '#FF9800' },
            { label: 'Server Uptime', value: health?.uptime ? formatUptime(health.uptime) : '—', color: '#0066FF' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '1.2rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Service Uptime ─── */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SvgServer size={14} /> Service Uptime
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {services.map((svc) => (
              <div key={svc.key} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '1.2rem',
              }}>
                {/* Service header: name + status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: getStatusColor(svc.status) }}>{svc.icon}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#E0E0E0' }}>{svc.name}</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                    background: `${getStatusColor(svc.status)}12`, color: getStatusColor(svc.status),
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(svc.status) }} />
                    {svc.status}
                  </div>
                </div>

                {/* Horizontal line bar of colored segments */}
                <div style={{ display: 'flex', gap: '2px', height: '34px', position: 'relative' }}>
                  {uptimeHistory.length === 0 ? (
                    <div style={{ color: '#999', fontSize: '0.78rem', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                      Collecting uptime data...
                    </div>
                  ) : (
                    uptimeHistory.map((entry, i) => (
                      <Tooltip
                        key={i}
                        visible={hoveredBar?.svc === svc.key && hoveredBar?.idx === i}
                        content={
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px', fontSize: '0.78rem' }}>
                              {entry.time}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: getBarColor(entry) }} />
                              <span style={{ color: getBarColor(entry), fontWeight: 600, textTransform: 'uppercase' }}>
                                {entry.status}
                              </span>
                            </div>
                            <div style={{ color: '#aaa' }}>
                              Latency: <span style={{ color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{entry.latency}ms</span>
                            </div>
                            {entry.checkedAt && (
                              <div style={{ color: '#999', fontSize: '0.68rem', marginTop: '3px' }}>
                                {new Date(entry.checkedAt).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div
                          onMouseEnter={() => setHoveredBar({ svc: svc.key, idx: i })}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{
                            width: '4px', minWidth: '3px', flex: '1 1 4px', height: '100%',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: '100%', height: '100%',
                            borderRadius: '2px', transition: 'all 0.15s',
                            background: getBarColor(entry),
                            opacity: hoveredBar?.svc === svc.key && hoveredBar?.idx === i ? 1 : 0.7,
                            transform: hoveredBar?.svc === svc.key && hoveredBar?.idx === i ? 'scaleY(1.15)' : 'scaleY(1)',
                            boxShadow: hoveredBar?.svc === svc.key && hoveredBar?.idx === i ? `0 0 8px ${getBarColor(entry)}60` : 'none',
                          }} />
                        </div>
                      </Tooltip>
                    ))
                  )}
                </div>

                {/* Uptime percentage below the bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'JetBrains Mono', monospace" }}>
                    {uptimePercent}% uptime
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#999' }}>
                    {uptimeHistory.length} checks
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend and 90-Day note */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.68rem', color: '#999' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#00C853', display: 'inline-block' }} />
                Fast (&lt;100ms)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7CB342', display: 'inline-block' }} />
                Normal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FF9800', display: 'inline-block' }} />
                Degraded
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FF3D00', display: 'inline-block' }} />
                Down
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#999' }}>
              90-Day Uptime — hover any segment for details
            </span>
          </div>
        </div>

        {/* ─── Your Device & Location ─── */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SvgMonitor size={14} /> Your Connection
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Device Info */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '1.2rem',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0066FF', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SvgMonitor size={14} color="#0066FF" /> Device Details
              </div>
              {deviceInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'Browser', value: deviceInfo.browser },
                    { label: 'Operating System', value: deviceInfo.os },
                    { label: 'Device Type', value: `${deviceInfo.device}${deviceInfo.touchScreen ? ' (Touch)' : ''}` },
                    { label: 'Screen', value: deviceInfo.screenRes },
                    { label: 'Language', value: deviceInfo.language },
                    { label: 'CPU Cores', value: deviceInfo.cores > 0 ? `${deviceInfo.cores} cores` : '—' },
                    { label: 'Memory', value: deviceInfo.memory },
                    { label: 'Network', value: deviceInfo.connection },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{row.label}</span>
                      <span style={{ fontSize: '0.78rem', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: '0.8rem' }}>Detecting...</div>
              )}
            </div>

            {/* Location Info */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '1.2rem',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF8C00', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SvgMapPin size={14} color="#FF8C00" /> Location & Network
              </div>
              {geo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'City', value: geo.city || '—' },
                    { label: 'Region', value: geo.region || '—' },
                    { label: 'Country', value: geo.country || '—' },
                    { label: 'Timezone', value: geo.timezone || '—' },
                    { label: 'ISP', value: geo.isp || '—' },
                    { label: 'Coordinates', value: geo.lat && geo.lon ? `${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}` : '—' },
                    { label: 'IP Address', value: health?.visitor?.ip || '—' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{row.label}</span>
                      <span style={{ fontSize: '0.78rem', color: '#E0E0E0', fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: '0.8rem' }}>Fetching location...</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── What We Monitor ─── */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Monitoring Details
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '1.2rem', fontSize: '0.8rem', color: '#888', lineHeight: 1.8,
          }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              This page checks system health every <strong style={{ color: '#E0E0E0' }}>30 seconds</strong> automatically.
              Each check pings the API server, tests database connectivity and measures response latency.
            </p>
            <p style={{ margin: 0 }}>
              Uptime history is stored in MongoDB Atlas and persists across server restarts and deployments (90-day retention).
              Each service displays a horizontal bar of color-coded segments. Hover any segment for exact timing.
              Green = fast (&lt;100ms), Yellow-Green = normal, Orange = degraded (&gt;300ms), Red = down.
            </p>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div style={{
          textAlign: 'center', padding: '2rem 0 0', borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.75rem', color: '#888',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <img src="/SGA.png" alt="SGALA" style={{ width: 20, height: 20, opacity: 0.5 }} />
            <span>SGALA — Shree Ganpati Agency Ledger Audit System</span>
          </div>
          <div>Powered by Next.js + Vercel + Firebase + MongoDB + Redis</div>
        </div>
      </main>

      <style jsx>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @media (max-width: 600px) {
          main { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
