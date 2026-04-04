'use client';

import { useState, useEffect, useCallback } from 'react';
import { auditAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { IconAudit, IconChevronLeft, IconChevronRight } from '@/components/icons/Icons';

interface AuditLog {
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

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '30',
      };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const data = await auditAPI.getAll(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="audit">
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconAudit size={22} /> Audit Logs</h1>
          <p className="main__subtitle">{total} event{total !== 1 ? 's' : ''} recorded</p>
        </div>
      </div>

      <div className="audit__filters">
        <div className="audit__filter-group">
          <label className="audit__filter-label">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className="audit__filter-group">
          <label className="audit__filter-label">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        <div className="audit__filter-group">
          <label className="audit__filter-label">&nbsp;</label>
          <button
            className="ledger__filter-btn"
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="audit__table-wrap">
        <table className="audit__table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td>
                    <span className={`audit__action-badge audit__action-badge--${log.actionType}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.actionDetails}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {log.ipAddress}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.sessionId ? log.sessionId.substring(0, 8) + '...' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="ledger__pagination">
          <button
            className="ledger__page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <IconChevronLeft size={14} /> Prev
          </button>
          <span className="ledger__page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="ledger__page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next <IconChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
