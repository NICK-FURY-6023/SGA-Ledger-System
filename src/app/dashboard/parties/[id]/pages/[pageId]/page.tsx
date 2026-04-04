'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { partyAPI } from '@/lib/api';
import { formatCurrency, formatDate, getTodayISO } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  IconPlus, IconClose, IconWarning, IconLock, IconUnlock,
  IconCalendar, IconCreditIn, IconDebitOut, IconReturn,
  IconBookOpen, IconChevronLeft, IconChevronRight, IconPages,
  IconAlertTriangle, IconParty, IconPhone, IconMapPin, IconClock,
} from '@/components/icons/Icons';

interface Party {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface PageInfo {
  id: string;
  pageNumber: number;
  title: string;
  status: 'open' | 'closed';
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
  createdBy: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  date: string;
  billNo: string;
  folio: string;
  debit: number;
  credit: number;
  sr: number;
  type: 'CIR' | 'DIR' | 'SR';
  pageBalance: number;
  createdAt: string;
}

export default function PageLedgerView() {
  const params = useParams();
  const { admin } = useAuth();
  const partyId = params.id as string;
  const pageId = params.pageId as string;

  const [party, setParty] = useState<Party | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayISO(),
    billNo: '',
    folio: '',
    amount: '',
    type: 'CIR' as 'CIR' | 'DIR' | 'SR',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Double-click prevention
  const submitLockRef = useRef(false);

  const loadPartyData = useCallback(async () => {
    try {
      const data = await partyAPI.getById(partyId);
      // API returns { ...party, pages } — party fields at top level
      const { pages, ...partyData } = data;
      setParty(partyData as Party);
      const matchedPage = (pages || []).find((p: PageInfo) => p.id === pageId);
      if (matchedPage) setPageInfo(matchedPage);
    } catch {
      toast.error('Failed to load party details');
    }
  }, [partyId, pageId]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const txParams: Record<string, string> = {
        page: currentPage.toString(),
        limit: '50',
      };
      const data = await partyAPI.getPageTransactions(partyId, pageId, txParams);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setOpeningBalance(data.openingBalance || 0);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [partyId, pageId, currentPage]);

  useEffect(() => {
    loadPartyData();
  }, [loadPartyData]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setFormError('');

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid positive amount');
      return;
    }
    if (!formData.billNo.trim()) {
      setFormError('Bill/Challan number is required');
      return;
    }

    submitLockRef.current = true;
    setSaving(true);
    try {
      const payload = {
        date: formData.date,
        billNo: formData.billNo.trim(),
        folio: formData.folio.trim(),
        debit: formData.type === 'DIR' ? amount : 0,
        credit: formData.type === 'CIR' ? amount : 0,
        sr: formData.type === 'SR' ? amount : 0,
        type: formData.type,
      };

      await partyAPI.addTransaction(partyId, pageId, payload);
      toast.success('Entry added successfully');
      setShowForm(false);
      resetForm();
      await loadTransactions();
      await loadPartyData();
    } catch (err: any) {
      const msg = err.message || 'Failed to add entry';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayISO(),
      billNo: '',
      folio: '',
      amount: '',
      type: 'CIR',
    });
    setFormError('');
  };

  // Group transactions by date
  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>((groups, tx) => {
    const key = tx.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
    return groups;
  }, {});
  const dateGroups = Object.entries(groupedByDate);

  // Current balance: last transaction's pageBalance or openingBalance
  const currentBalance = transactions.length > 0
    ? transactions[transactions.length - 1].pageBalance
    : openingBalance;

  return (
    <div className="ledger">
      {/* Back link */}
      <Link
        href={`/dashboard/parties/${partyId}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          textDecoration: 'none',
        }}
      >
        <IconChevronLeft size={14} /> {party?.name || 'Party'} / Pages
      </Link>

      {/* Customer Info Card */}
      {party && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.2rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--blue-primary), var(--blue-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px var(--blue-glow)',
            }}>
              <IconParty size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {party.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Khata</div>
            </div>
          </div>
          {party.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <IconPhone size={14} /> {party.phone}
            </div>
          )}
          {party.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <IconMapPin size={14} /> {party.address}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>
            <IconClock size={13} />
            Created: {formatDate(party.createdAt)} by {party.createdBy}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="main__header">
        <div>
          <h1 className="main__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconPages size={22} />
            Page {pageInfo?.pageNumber || '...'} {pageInfo?.title ? `\u2014 ${pageInfo.title}` : ''}
            {pageInfo && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.5px',
                marginLeft: '8px',
                background: pageInfo.status === 'open' ? 'rgba(0,200,83,0.12)' : 'rgba(255,61,0,0.12)',
                color: pageInfo.status === 'open' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${pageInfo.status === 'open' ? 'rgba(0,200,83,0.3)' : 'rgba(255,61,0,0.3)'}`,
              }}>
                {pageInfo.status === 'open' ? <IconUnlock size={11} /> : <IconLock size={11} />}
                {pageInfo.status === 'open' ? 'OPEN' : 'CLOSED'}
              </span>
            )}
          </h1>
          <p className="main__subtitle">
            {total} entr{total !== 1 ? 'ies' : 'y'} recorded
          </p>
        </div>
      </div>

      {/* Info bar */}
      <div className="stats" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card__label">Opening Balance</div>
          <div className="stat-card__value stat-card__value--blue" style={{ fontSize: '1.4rem' }}>
            {formatCurrency(openingBalance)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Current Balance</div>
          <div className={`stat-card__value ${currentBalance >= 0 ? 'stat-card__value--green' : 'stat-card__value--red'}`} style={{ fontSize: '1.4rem' }}>
            {formatCurrency(currentBalance)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Entries</div>
          <div className="stat-card__value stat-card__value--orange" style={{ fontSize: '1.4rem' }}>
            {total}
          </div>
        </div>
      </div>

      {/* Closed banner */}
      {pageInfo?.status === 'closed' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          background: 'rgba(255,214,0,0.08)',
          border: '1px solid rgba(255,214,0,0.25)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--warning)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}>
          <IconAlertTriangle size={16} />
          This page is closed. No new entries can be added.
        </div>
      )}

      {/* Toolbar */}
      {pageInfo?.status === 'open' && (
        <div className="ledger__toolbar" style={{ marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }} />
          <button
            className="ledger__add-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <IconPlus size={14} /> New Entry
          </button>
        </div>
      )}

      {/* Ledger Table */}
      <div className="ledger__table-wrap">
        <table className="ledger__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill / Challan No</th>
              <th>P. / Folio</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>SR</th>
              <th>Type</th>
              <th>Page Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#8B7D5E' }}>
                  <div className="ledger__spinner" />
                  Loading...
                </td>
              </tr>
            ) : transactions.length === 0 && openingBalance === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="ledger__empty">
                    <div className="ledger__empty-icon"><IconBookOpen size={48} /></div>
                    <div className="ledger__empty-text">
                      {pageInfo?.status === 'closed'
                        ? 'This page has no transactions.'
                        : 'No entries yet. Click "New Entry" to add your first record.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Opening balance row */}
                {openingBalance !== 0 && currentPage === 1 && (
                  <tr>
                    <td style={{ fontStyle: 'italic', color: '#8B7D5E' }}>--</td>
                    <td colSpan={2} style={{ fontStyle: 'italic', fontWeight: 600, color: '#8B7D5E' }}>
                      Opening Balance (Carry Forward)
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="ledger__balance" style={{ fontWeight: 700 }}>
                      {formatCurrency(openingBalance)}
                    </td>
                  </tr>
                )}
                {dateGroups.map(([date, txs]) => (
                  <>
                    <tr key={`date-${date}`} className="ledger__date-header">
                      <td colSpan={8}>
                        <IconCalendar size={14} /> {formatDate(date)}
                      </td>
                    </tr>
                    {txs.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.date)}</td>
                        <td style={{ fontWeight: 600 }}>{tx.billNo}</td>
                        <td>{tx.folio || '\u2014'}</td>
                        <td className="ledger__amount ledger__amount--debit">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : ''}
                        </td>
                        <td className="ledger__amount ledger__amount--credit">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : ''}
                        </td>
                        <td className="ledger__amount ledger__amount--sr">
                          {tx.sr > 0 ? formatCurrency(tx.sr) : ''}
                        </td>
                        <td>
                          <span className={`ledger__type ledger__type--${tx.type}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`ledger__balance ${tx.pageBalance < 0 ? 'ledger__balance--negative' : ''}`}>
                          {formatCurrency(tx.pageBalance)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="ledger__pagination">
          <button
            className="ledger__page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <IconChevronLeft size={14} /> Prev
          </button>
          <span className="ledger__page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="ledger__page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next <IconChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Entry Form Modal */}
      {showForm && (
        <div className="entry-modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <form className="entry-form" onSubmit={handleSubmit}>
            <div className="entry-form__title">
              <span>New Entry</span>
              <button type="button" className="entry-form__close" onClick={() => setShowForm(false)}>
                <IconClose size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                marginBottom: '1rem',
                padding: '10px 14px',
                background: 'rgba(255,61,0,0.1)',
                border: '1px solid rgba(255,61,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}>
                {formError}
              </div>
            )}

            {/* Type selector */}
            <div className="entry-form__type-select">
              {(['CIR', 'DIR', 'SR'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`entry-form__type-btn ${
                    formData.type === t ? `entry-form__type-btn--active-${t}` : ''
                  }`}
                  onClick={() => setFormData({ ...formData, type: t })}
                >
                  {t === 'CIR' ? <><IconCreditIn size={14} /> Credit (CIR)</> : t === 'DIR' ? <><IconDebitOut size={14} /> Debit (DIR)</> : <><IconReturn size={14} /> Sales Return (SR)</>}
                </button>
              ))}
            </div>

            <div className="entry-form__grid" style={{ marginTop: '1rem' }}>
              <div className="entry-form__field">
                <label className="entry-form__label">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Bill / Challan No *</label>
                <input
                  type="text"
                  placeholder="e.g. INV-001"
                  value={formData.billNo}
                  onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                  required
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">P. / Folio</label>
                <input
                  type="text"
                  placeholder="Page reference"
                  value={formData.folio}
                  onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">
                  Amount ({formData.type === 'CIR' ? 'Credit' : formData.type === 'DIR' ? 'Debit' : 'SR'}) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="entry-form__submit" disabled={saving}>
                {saving ? (
                  <><span className="ledger__spinner ledger__spinner--sm" /> Saving...</>
                ) : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
