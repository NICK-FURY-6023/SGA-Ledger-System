'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { IconDashboard, IconLedger, IconAudit, IconExport, IconSettings, IconMenu, IconLogout } from '@/components/icons/Icons';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/dashboard/ledger', label: 'Ledger', Icon: IconLedger },
  { href: '/dashboard/audit', label: 'Audit Logs', Icon: IconAudit },
  { href: '/dashboard/export', label: 'Export', Icon: IconExport },
  { href: '/dashboard/settings', label: 'Settings', Icon: IconSettings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0A0A0F', color: '#FFF'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="dashboard">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <IconMenu size={22} />
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <img src="/SGA.png" alt="SGALA" className="sidebar__logo" />
          <span className="sidebar__brand">SGALA</span>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link ${
                pathname === item.href ? 'sidebar__link--active' : ''
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.Icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {admin?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className="sidebar__username">{admin?.username}</div>
              <div className="sidebar__role">{admin?.role}</div>
            </div>
          </div>
          <button className="sidebar__logout" onClick={handleLogout}>
            <IconLogout size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  );
}
