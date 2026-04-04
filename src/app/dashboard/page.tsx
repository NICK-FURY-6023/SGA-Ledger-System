'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { transactionAPI, auditAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
    todayEntries: 0,
    recentActivity: [] as any[],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [txRes, auditRes] = await Promise.all([
        transactionAPI.getAll({ limit: '1000' }),
        auditAPI.getAll({ limit: '5' }),
      ]);

      const transactions = txRes.transactions || [];
      const today = new Date().toISOString().split('T')[0];

      const totalDebit = transactions.reduce((s: number, t: any) => s + (t.debit || 0), 0);
      const totalCredit = transactions.reduce((s: number, t: any) => s + (t.credit || 0) + (t.sr || 0), 0);
      const lastBalance = transactions.length > 0
        ? transactions[transactions.length - 1].balance
        : 0;
      const todayEntries = transactions.filter((t: any) => t.date === today).length;

      setStats({
        totalTransactions: transactions.length,
        totalDebit,
        totalCredit,
        currentBalance: lastBalance,
        todayEntries,
        recentActivity: auditRes.logs || [],
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
          <p className="main__subtitle">Welcome back, {admin?.username}</p>
        </div>
      </div>

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
        <div className="stat-card">
          <div className="stat-card__label">Today&apos;s Entries</div>
          <div className="stat-card__value stat-card__value--orange">
            {stats.todayEntries}
          </div>
        </div>
      </div>

      {stats.recentActivity.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Recent Activity
          </h3>
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
