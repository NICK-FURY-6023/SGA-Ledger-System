'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { transactionAPI, auditAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconCalendar, IconArrowRight, IconLedger, IconActivity, IconDatabase, IconShield, IconCheckCircle, IconFilePdf } from '@/components/icons/Icons';

export default function DashboardPage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === 'superadmin';
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
    todayEntries: 0,
    todayDebit: 0,
    todayCredit: 0,
    todaySR: 0,
    recentActivity: [] as any[],
    dbStatus: 'unknown',
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const promises: Promise<any>[] = [
        transactionAPI.getAll({ limit: '10000' }),
      ];
      if (isSuperAdmin) {
        promises.push(auditAPI.getAll({ limit: '10' }));
        promises.push(fetch('/api/health').then(r => r.json()).catch(() => ({ database: 'unknown' })));
      }

      const results = await Promise.all(promises);
      const txRes = results[0];
      const auditRes = isSuperAdmin ? results[1] : { logs: [] };
      const health = isSuperAdmin ? results[2] : { database: 'unknown' };

      const transactions = txRes.transactions || [];
      const today = new Date().toISOString().split('T')[0];

      const totalDebit = transactions.reduce((s: number, t: any) => s + (t.debit || 0), 0);
      const totalCredit = transactions.reduce((s: number, t: any) => s + (t.credit || 0) + (t.sr || 0), 0);
      const lastBalance = transactions.length > 0
        ? transactions[transactions.length - 1].balance
        : 0;

      const todayTxs = transactions.filter((t: any) => t.date === today);
      const todayDebit = todayTxs.reduce((s: number, t: any) => s + (t.debit || 0), 0);
      const todayCredit = todayTxs.reduce((s: number, t: any) => s + (t.credit || 0), 0);
      const todaySR = todayTxs.reduce((s: number, t: any) => s + (t.sr || 0), 0);

      setStats({
        totalTransactions: transactions.length,
        totalDebit,
        totalCredit,
        currentBalance: lastBalance,
        todayEntries: todayTxs.length,
        todayDebit,
        todayCredit,
        todaySR,
        recentActivity: auditRes.logs || [],
        dbStatus: health.database || 'unknown',
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  return (
    <div>
      <div className="main__header">
        <div>
          <h1 className="main__title">Dashboard</h1>
          <p className="main__subtitle">
            Welcome back, {admin?.username} {isSuperAdmin ? '(Developer)' : '(Admin)'}
          </p>
        </div>
      </div>

      {/* Core Stats */}
      <div className="stats">
        <div className="stat-card">
          <div className="stat-card__label">Total Transactions</div>
          <div className="stat-card__value stat-card__value--blue">
            {stats.totalTransactions}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Debit</div>
          <div className="stat-card__value stat-card__value--red">
            {formatCurrency(stats.totalDebit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Credit</div>
          <div className="stat-card__value stat-card__value--green">
            {formatCurrency(stats.totalCredit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Current Balance</div>
          <div className={`stat-card__value ${stats.currentBalance >= 0 ? 'stat-card__value--green' : 'stat-card__value--red'}`}>
            {formatCurrency(stats.currentBalance)}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <IconCalendar size={16} /> Today&apos;s Summary
        </h3>
        <div className="stats">
          <div className="stat-card">
            <div className="stat-card__label">Today&apos;s Entries</div>
            <div className="stat-card__value stat-card__value--orange">
              {stats.todayEntries}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Today&apos;s Debit</div>
            <div className="stat-card__value stat-card__value--red">
              {formatCurrency(stats.todayDebit)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Today&apos;s Credit</div>
            <div className="stat-card__value stat-card__value--green">
              {formatCurrency(stats.todayCredit)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Today&apos;s SR</div>
            <div className="stat-card__value stat-card__value--blue">
              {formatCurrency(stats.todaySR)}
            </div>
          </div>
        </div>
      </div>

      {/* Admin: Quick Actions */}
      {!isSuperAdmin && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/ledger" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '1rem 1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: '0.5rem', color: 'var(--accent-blue)', textDecoration: 'none',
              fontSize: '0.95rem', transition: 'border-color 0.2s',
            }}>
              <IconLedger size={18} /> Open Ledger <IconArrowRight size={14} />
            </Link>
            <Link href="/dashboard/export" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '1rem 1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: '0.5rem', color: 'var(--accent-orange)', textDecoration: 'none',
              fontSize: '0.95rem', transition: 'border-color 0.2s',
            }}>
              <IconFilePdf size={18} /> Export Data <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Developer: System Overview */}
      {isSuperAdmin && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <IconActivity size={16} /> System Overview
          </h3>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-card__label"><IconDatabase size={14} /> Database</div>
              <div className="stat-card__value" style={{ fontSize: '1rem', color: stats.dbStatus === 'firestore' ? '#4CAF50' : '#FF9800' }}>
                {stats.dbStatus === 'firestore' ? (
                  <><IconCheckCircle size={16} color="#4CAF50" /> Firestore</>
                ) : (
                  <><IconShield size={16} color="#FF9800" /> In-Memory</>
                )}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label"><IconShield size={14} /> Your Role</div>
              <div className="stat-card__value" style={{ fontSize: '1rem', color: 'var(--accent-blue)' }}>
                Super Admin
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developer: Recent Audit Activity */}
      {isSuperAdmin && stats.recentActivity.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              Recent Activity
            </h3>
            <Link href="/dashboard/audit" style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', textDecoration: 'none' }}>
              View All <IconArrowRight size={12} />
            </Link>
          </div>
          <div className="audit__table-wrap">
            <table className="audit__table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`audit__action-badge audit__action-badge--${log.actionType}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.actionDetails}</td>
                    <td>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
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
