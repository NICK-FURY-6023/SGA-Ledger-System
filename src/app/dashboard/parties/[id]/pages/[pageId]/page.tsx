'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { partyAPI } from '@/lib/api';
import { formatRegisterAmount, formatDate, getTodayISO } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  IconPlus, IconClose, IconWarning, IconEdit, IconTrash,
  IconCreditIn, IconDebitOut, IconReturn,
  IconChevronLeft, IconChevronRight, IconPrinter,
} from '@/components/icons/Icons';

const MAX_LINES = 25;

interface Party {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gst?: string;
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
  maxLines?: number;
  transactionCount: number;
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
  lineNumber: number;
  pageBalance: number;
  createdAt: string;
}

interface AllPages {
  id: string;
  pageNumber: number;
  status: 'open' | 'closed';
}

export default function PageLedgerView() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAuth();
  const partyId = params.id as string;
  const pageId = params.pageId as string;

  const [party, setParty] = useState<Party | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [allPages, setAllPages] = useState<AllPages[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Entry form
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    date: getTodayISO(),
    billNo: '',
    folio: '',
    amount: '',
    type: 'CIR' as 'CIR' | 'DIR' | 'SR',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitLockRef = useRef(false);

  // Delete confirmation
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPartyData = useCallback(async () => {
    try {
      const data = await partyAPI.getById(partyId);
      const { pages, ...partyData } = data;
      setParty(partyData as Party);
      setAllPages((pages || []).map((p: any) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        status: p.status,
      })));
      const matchedPage = (pages || []).find((p: any) => p.id === pageId);
      if (matchedPage) setPageInfo(matchedPage);
    } catch {
      toast.error('Failed to load party details');
    }
  }, [partyId, pageId]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partyAPI.getPageTransactions(partyId, pageId, { limit: '100' });
      setTransactions(data.transactions || []);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [partyId, pageId]);

  useEffect(() => {
    loadPartyData();
  }, [loadPartyData]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const maxLines = pageInfo?.maxLines || MAX_LINES;
  const isFull = transactions.length >= maxLines;
  const isOpen = pageInfo?.status === 'open';

  // Current balance from last transaction
  const currentBalance = transactions.length > 0
    ? transactions[transactions.length - 1].pageBalance
    : 0;

  const resetForm = () => {
    setFormData({ date: getTodayISO(), billNo: '', folio: '', amount: '', type: 'CIR' });
    setFormError('');
    setEditingTx(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    const amt = tx.debit > 0 ? tx.debit : tx.credit > 0 ? tx.credit : tx.sr;
    setFormData({
      date: tx.date,
      billNo: tx.billNo,
      folio: tx.folio,
      amount: amt.toString(),
      type: tx.type,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setFormError('');

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid positive amount');
      return;
    }
    if (!formData.billNo.trim()) {
      setFormError('Bill/Challan number is required');
      return;
    }

    submitLockRef.current = true;
    setSaving(true);
    try {
      if (editingTx) {
        await partyAPI.updateTransaction(partyId, pageId, editingTx.id, {
          date: formData.date,
          billNo: formData.billNo.trim(),
          folio: formData.folio.trim(),
          amount,
          type: formData.type,
        });
        toast.success('Entry updated');
      } else {
        await partyAPI.addTransaction(partyId, pageId, {
          date: formData.date,
          billNo: formData.billNo.trim(),
          folio: formData.folio.trim(),
          amount,
          type: formData.type,
        });
        toast.success('Entry added');
      }
      setShowForm(false);
      resetForm();
      await loadTransactions();
      await loadPartyData();
    } catch (err: any) {
      const msg = err.message || 'Failed to save entry';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!deletingTx) return;
    setDeleteLoading(true);
    try {
      await partyAPI.deleteTransaction(partyId, pageId, deletingTx.id);
      toast.success('Entry deleted');
      setDeletingTx(null);
      await loadTransactions();
      await loadPartyData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Navigate to adjacent pages
  const currentPageIdx = allPages.findIndex(p => p.id === pageId);
  const prevPage = currentPageIdx > 0 ? allPages[currentPageIdx - 1] : null;
  const nextPage = currentPageIdx < allPages.length - 1 ? allPages[currentPageIdx + 1] : null;

  // Build rows: fill empty lines
  const rows: (Transaction | null)[] = [];
  for (let i = 0; i < maxLines; i++) {
    rows.push(transactions[i] || null);
  }

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const dd = dt.getDate().toString().padStart(2, '0');
    const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
    const yy = dt.getFullYear().toString().slice(-2);
    return `${dd}.${mm}.${yy}`;
  };

  return (
    <div className="register">
      {/* Navigation */}
      <div className="register__nav">
        <Link href={`/dashboard/parties/${partyId}`} className="register__back">
          <IconChevronLeft size={14} /> {party?.name || 'Party'} / Pages
        </Link>
        <div className="register__nav-actions">
          {isOpen && !isFull && (
            <button className="register__btn register__btn--primary" onClick={openAddForm}>
              <IconPlus size={14} /> New Entry
            </button>
          )}
          <button className="register__btn" onClick={() => window.print()}>
            <IconPrinter size={14} /> Print
          </button>
        </div>
      </div>

      {/* Page full warning */}
      {isFull && isOpen && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', marginBottom: '1rem',
          background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)',
          borderRadius: 'var(--radius-sm)', color: 'var(--warning)',
          fontSize: '0.85rem', fontWeight: 500,
        }}>
          <IconWarning size={16} />
          Page is full ({maxLines} lines). Create a new page from the party view.
        </div>
      )}

      {/* Register Paper */}
      <div className="register__paper">
        {/* Header - matching physical register */}
        <div className="register__header">
          <div>
            <div className="register__header-title">
              LEDGER <span className="register__header-hindi">/ &#x0916;&#x093E;&#x0924;&#x093E;</span>
            </div>
            <div className="register__header-info">
              <div className="register__header-field">
                <span className="register__header-label">Account of (&#x0928;&#x093E;&#x092E; &#x0916;&#x093E;&#x0924;&#x093E;):</span>
                <span className="register__header-value">{party?.name || '...'}</span>
              </div>
              <div className="register__header-field">
                <span className="register__header-label">Address (&#x092A;&#x0924;&#x093E;):</span>
                <span className="register__header-value">{party?.address || '-'}</span>
              </div>
              <div className="register__header-field">
                <span className="register__header-label">Phone/E-mail (&#x0926;&#x0942;&#x0930;&#x092D;&#x093E;&#x0937;):</span>
                <span className="register__header-value">{party?.phone || '-'}</span>
              </div>
              <div className="register__header-field">
                <span className="register__header-label">GSTIN No.:</span>
                <span className="register__header-value">{party?.gst || '-'}</span>
              </div>
            </div>
          </div>
          <div className="register__page-number">
            <span className="register__page-label">Page No.</span>
            <span className="register__page-num">
              {pageInfo?.pageNumber?.toString().padStart(3, '0') || '...'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="register__table-wrap">
          <table className="register__table">
            <colgroup>
              <col className="col-date" />
              <col className="col-particulars" />
              <col className="col-folio" />
              <col className="col-debit-r" />
              <col className="col-debit-p" />
              <col className="col-credit-r" />
              <col className="col-credit-p" />
              <col className="col-type" />
              <col className="col-balance-r" />
              <col className="col-balance-p" />
              {isOpen && <col className="col-actions" />}
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>Date<br /><small style={{ color: '#8B7D5E', fontWeight: 600 }}>&#x0924;&#x093F;&#x0925;&#x093F;</small></th>
                <th rowSpan={2}>Particulars<br /><small style={{ color: '#8B7D5E', fontWeight: 600 }}>&#x0935;&#x093F;&#x0935;&#x0930;&#x0923;</small></th>
                <th rowSpan={2}>Folio<br /><small style={{ color: '#8B7D5E', fontWeight: 600 }}>&#x092A;&#x0943;&#x0937;&#x094D;&#x0920;</small></th>
                <th colSpan={2} className="register__th-group">Debit &#x0928;&#x093E;&#x092E;</th>
                <th colSpan={2} className="register__th-group">Credit &#x091C;&#x092E;&#x093E;</th>
                <th rowSpan={2}>Dr./Cr.</th>
                <th colSpan={2} className="register__th-group">Balance &#x0936;&#x0947;&#x0937;</th>
                {isOpen && <th rowSpan={2} style={{ width: '60px' }}></th>}
              </tr>
              <tr>
                <th>&#x20B9;</th>
                <th>P.</th>
                <th>&#x20B9;</th>
                <th>P.</th>
                <th>&#x20B9;</th>
                <th>P.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isOpen ? 11 : 10} style={{ textAlign: 'center', padding: '3rem', color: '#4A5D80' }}>
                    <div className="register__spinner" />
                    <div style={{ marginTop: '0.5rem' }}>Loading...</div>
                  </td>
                </tr>
              ) : (
                rows.map((tx, i) => {
                  if (!tx) {
                    // Empty ruled line
                    return (
                      <tr key={`empty-${i}`} className="register__row--empty">
                        <td className="register__cell-date">&nbsp;</td>
                        <td className="register__cell-particulars">&nbsp;</td>
                        <td className="register__cell-folio">&nbsp;</td>
                        <td className="register__amount">&nbsp;</td>
                        <td className="register__paise">&nbsp;</td>
                        <td className="register__amount">&nbsp;</td>
                        <td className="register__paise">&nbsp;</td>
                        <td>&nbsp;</td>
                        <td className="register__balance">&nbsp;</td>
                        <td className="register__paise">&nbsp;</td>
                        {isOpen && <td>&nbsp;</td>}
                      </tr>
                    );
                  }

                  const debitAmt = formatRegisterAmount(tx.debit);
                  const creditAmt = formatRegisterAmount(tx.credit > 0 ? tx.credit : tx.sr);
                  const balAmt = formatRegisterAmount(tx.pageBalance);

                  return (
                    <tr key={tx.id}>
                      <td className="register__cell-date">{fmtDate(tx.date)}</td>
                      <td className="register__cell-particulars">{tx.billNo}</td>
                      <td className="register__cell-folio">{tx.folio || ''}</td>
                      <td className={`register__amount ${tx.debit > 0 ? 'register__amount--debit' : ''}`}>
                        {debitAmt.rupees}
                      </td>
                      <td className="register__paise">
                        {tx.debit > 0 ? `=${debitAmt.paise}` : ''}
                      </td>
                      <td className={`register__amount ${(tx.credit > 0 || tx.sr > 0) ? (tx.sr > 0 ? 'register__amount--sr' : 'register__amount--credit') : ''}`}>
                        {creditAmt.rupees}
                      </td>
                      <td className="register__paise">
                        {(tx.credit > 0 || tx.sr > 0) ? `=${creditAmt.paise}` : ''}
                      </td>
                      <td>
                        <span className={`register__type register__type--${tx.type}`}>{tx.type}</span>
                      </td>
                      <td className={`register__balance ${tx.pageBalance < 0 ? 'register__balance--negative' : ''}`}>
                        {balAmt.rupees}
                      </td>
                      <td className="register__paise">{balAmt.paise ? `=${balAmt.paise}` : ''}</td>
                      {isOpen && (
                        <td className="register__row-actions">
                          <button
                            className="register__action-btn register__action-btn--edit"
                            onClick={() => openEditForm(tx)}
                            title="Edit"
                          >
                            <IconEdit size={13} />
                          </button>
                          <button
                            className="register__action-btn register__action-btn--delete"
                            onClick={() => setDeletingTx(tx)}
                            title="Delete"
                          >
                            <IconTrash size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="register__footer">
          <div className="register__footer-balance">
            Balance &#x0936;&#x0947;&#x0937;:
            <strong>
              {(() => {
                const b = formatRegisterAmount(currentBalance);
                return b.rupees ? `${b.rupees}=${b.paise}` : '0=00';
              })()}
            </strong>
          </div>
          <div className="register__footer-lines">
            {transactions.length} / {maxLines} lines
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="register__page-nav">
        <button
          className="register__page-btn"
          disabled={!prevPage}
          onClick={() => prevPage && router.push(`/dashboard/parties/${partyId}/pages/${prevPage.id}`)}
        >
          <IconChevronLeft size={14} /> Prev Page
        </button>
        <span className="register__page-indicator">
          Page {pageInfo?.pageNumber || '?'} of {allPages.length}
        </span>
        <button
          className="register__page-btn"
          disabled={!nextPage}
          onClick={() => nextPage && router.push(`/dashboard/parties/${partyId}/pages/${nextPage.id}`)}
        >
          Next Page <IconChevronRight size={14} />
        </button>
      </div>

      {/* Entry Form Modal */}
      {showForm && (
        <div className="entry-modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <form className="entry-form" onSubmit={handleSubmit}>
            <div className="entry-form__title">
              <span>{editingTx ? 'Edit Entry' : 'New Entry'}</span>
              <button type="button" className="entry-form__close" onClick={() => setShowForm(false)}>
                <IconClose size={18} />
              </button>
            </div>

            {/* Edit info */}
            {editingTx && (
              <div className="entry-form__info">
                <span>Customer: <strong>{party?.name}</strong></span>
                <span>Page: <strong>{pageInfo?.pageNumber}</strong></span>
                <span>Line: <strong>{editingTx.lineNumber}</strong></span>
                <span>Bill: <strong>{editingTx.billNo}</strong></span>
              </div>
            )}

            {formError && (
              <div style={{
                marginBottom: '1rem', padding: '10px 14px',
                background: 'rgba(255,61,0,0.1)', border: '1px solid rgba(255,61,0,0.3)',
                borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem',
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
                  className={`entry-form__type-btn ${formData.type === t ? `entry-form__type-btn--active-${t}` : ''}`}
                  onClick={() => setFormData({ ...formData, type: t })}
                >
                  {t === 'CIR' ? <><IconCreditIn size={14} /> Credit (CIR)</> :
                   t === 'DIR' ? <><IconDebitOut size={14} /> Debit (DIR)</> :
                   <><IconReturn size={14} /> SR</>}
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
                  placeholder="e.g. C.NO-669"
                  value={formData.billNo}
                  onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                  required
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">P. / Folio</label>
                <input
                  type="text"
                  placeholder="Page ref"
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
                  <><span className="register__spinner register__spinner--sm" /> Saving...</>
                ) : editingTx ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTx && (
        <div className="entry-modal" onClick={(e) => {
          if (e.target === e.currentTarget) setDeletingTx(null);
        }}>
          <div className="entry-form" style={{ maxWidth: '400px' }}>
            <div className="entry-form__title">
              <span>Delete Entry</span>
              <button type="button" className="entry-form__close" onClick={() => setDeletingTx(null)}>
                <IconClose size={18} />
              </button>
            </div>
            <div className="register__confirm">
              <p>
                Delete line {deletingTx.lineNumber}: <strong>{deletingTx.billNo}</strong> ({deletingTx.type})?
                All subsequent balances will be recalculated.
              </p>
              <div className="register__confirm-actions">
                <button
                  className="register__btn"
                  onClick={() => setDeletingTx(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  className="register__btn register__btn--danger"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
