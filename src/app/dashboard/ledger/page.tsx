'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionAPI } from '@/lib/api';
import { formatCurrency, formatDate, getTodayISO } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  IconLedger, IconSearch, IconFilter, IconPlus, IconEdit, IconTrash,
  IconBookOpen, IconCalendar, IconClose, IconWarning, IconCreditIn, IconDebitOut, IconReturn,
  IconChevronLeft, IconChevronRight
} from '@/components/icons/Icons';

interface Transaction {
  id: string;
  date: string;
  partyName: string;
  billNo: string;
  folio: string;
  debit: number;
  credit: number;
  sr: number;
  type: 'CIR' | 'DIR' | 'SR';
  balance: number;
  createdAt: string;
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchBill, setSearchBill] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Entry form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: getTodayISO(),
    partyName: '',
    billNo: '',
    folio: '',
    amount: '',
    type: 'CIR' as 'CIR' | 'DIR' | 'SR',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '50',
      };
      if (searchBill) params.billNo = searchBill;
      if (filterType) params.type = filterType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await transactionAPI.getAll(params);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, searchBill, filterType, dateFrom, dateTo]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setSaving(true);
    try {
      const payload = {
        date: formData.date,
        partyName: formData.partyName.trim(),
        billNo: formData.billNo.trim(),
        folio: formData.folio.trim(),
        debit: formData.type === 'DIR' ? amount : 0,
        credit: formData.type === 'CIR' ? amount : 0,
        sr: formData.type === 'SR' ? amount : 0,
        type: formData.type,
      };

      if (editId) {
        await transactionAPI.update(editId, payload);
        toast.success('Transaction updated successfully');
      } else {
        await transactionAPI.create(payload);
        toast.success('Transaction added successfully');
      }

      setShowForm(false);
      setEditId(null);
      resetForm();
      await loadTransactions();
    } catch (err: any) {
      const msg = err.message || 'Failed to save transaction';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setFormData({
      date: tx.date,
      partyName: tx.partyName || '',
      billNo: tx.billNo,
      folio: tx.folio,
      amount: (tx.debit || tx.credit || tx.sr).toString(),
      type: tx.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await transactionAPI.delete(id);
      setDeleteId(null);
      toast.success('Transaction deleted');
      await loadTransactions();
    } catch (err) {
      toast.error('Failed to delete transaction');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayISO(),
      partyName: '',
      billNo: '',
      folio: '',
      amount: '',
      type: 'CIR',
    });
    setFormError('');
    setEditId(null);
  };

  // Group transactions by date for bahi-khata style
  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>((groups, tx) => {
    const key = tx.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
    return groups;
  }, {});
  const dateGroups = Object.entries(groupedByDate);

  return (
    <div className="ledger">
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconLedger size={22} /> Ledger</h1>
          <p className="main__subtitle">
            {total} transaction{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ledger__toolbar">
        <input
          type="text"
          className="ledger__search"
          placeholder="Search by Bill/Challan No..."
          value={searchBill}
          onChange={(e) => { setSearchBill(e.target.value); setPage(1); }}
        />
        <button
          className={`ledger__filter-btn ${showFilters ? 'ledger__filter-btn--active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <IconFilter size={14} /> Filters
        </button>
        {(['CIR', 'DIR', 'SR'] as const).map((t) => (
          <button
            key={t}
            className={`ledger__filter-btn ${filterType === t ? 'ledger__filter-btn--active' : ''}`}
            onClick={() => { setFilterType(filterType === t ? '' : t); setPage(1); }}
          >
            {t}
          </button>
        ))}
        <button
          className="ledger__add-btn"
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          <IconPlus size={14} /> New Entry
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="ledger__filters">
          <div className="ledger__filter-group">
            <label className="ledger__filter-label">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="ledger__filter-group">
            <label className="ledger__filter-label">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
          <div className="ledger__filter-group">
            <label className="ledger__filter-label">&nbsp;</label>
            <button
              className="ledger__filter-btn"
              onClick={() => {
                setDateFrom(''); setDateTo(''); setFilterType('');
                setSearchBill(''); setPage(1);
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Register-style table with date grouping */}
      <div className="ledger__table-wrap">
        <table className="ledger__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Party / Customer</th>
              <th>Bill / Challan No</th>
              <th>P. / Folio</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>SR</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#8B7D5E' }}>
                  <div className="ledger__spinner" />
                  Loading...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="ledger__empty">
                    <div className="ledger__empty-icon"><IconBookOpen size={48} /></div>
                    <div className="ledger__empty-text">
                      No transactions found. Click &quot;New Entry&quot; to add your first record.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              dateGroups.map(([date, txs]) => (
                <>
                  <tr key={`date-${date}`} className="ledger__date-header">
                    <td colSpan={10}>
                      <IconCalendar size={14} /> {formatDate(date)}
                    </td>
                  </tr>
                  {txs.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.date)}</td>
                      <td style={{ fontStyle: tx.partyName ? 'normal' : 'italic', color: tx.partyName ? 'inherit' : '#8B7D5E' }}>
                        {tx.partyName || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{tx.billNo}</td>
                      <td>{tx.folio || '—'}</td>
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
                      <td className={`ledger__balance ${tx.balance < 0 ? 'ledger__balance--negative' : ''}`}>
                        {formatCurrency(tx.balance)}
                      </td>
                      <td>
                        <div className="ledger__actions">
                          <button
                            className="ledger__action-btn ledger__action-btn--edit"
                            onClick={() => handleEdit(tx)}
                            title="Edit"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            className="ledger__action-btn ledger__action-btn--delete"
                            onClick={() => setDeleteId(tx.id)}
                            title="Delete"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Entry Form Modal */}
      {showForm && (
        <div className="entry-modal" onClick={(e) => {
          if (e.target === e.currentTarget) { setShowForm(false); setEditId(null); }
        }}>
          <form className="entry-form" onSubmit={handleSubmit}>
            <div className="entry-form__title">
              <span>{editId ? 'Edit Transaction' : 'New Transaction'}</span>
              <button
                type="button"
                className="entry-form__close"
                onClick={() => { setShowForm(false); setEditId(null); }}
              >
                <IconClose size={18} />
              </button>
            </div>

            {formError && (
              <div className="login__error" style={{ marginBottom: '1rem' }}>{formError}</div>
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
                <label className="entry-form__label">Party / Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders"
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
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

              <button
                type="submit"
                className="entry-form__submit"
                disabled={saving}
              >
                {saving ? (
                  <><span className="ledger__spinner ledger__spinner--sm" /> Saving...</>
                ) : editId ? 'Update Transaction' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="entry-modal" onClick={(e) => {
          if (e.target === e.currentTarget) setDeleteId(null);
        }}>
          <div className="entry-form" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--accent-orange)' }}><IconWarning size={48} /></div>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Delete Transaction?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              This action cannot be undone. All subsequent balances will be recalculated.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button
                className="ledger__filter-btn"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 24px', background: 'var(--danger)', color: 'white',
                  borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.85rem',
                }}
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
