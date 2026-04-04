'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

type EditableField = 'date' | 'partyName' | 'billNo' | 'folio' | 'debit' | 'credit' | 'sr';

const FIELD_ORDER: EditableField[] = ['date', 'partyName', 'billNo', 'folio', 'debit', 'credit', 'sr'];

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

  // Inline editing (Excel-like)
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Double-click prevention
  const submitLockRef = useRef(false);
  const deleteLockRef = useRef(false);

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

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

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
      submitLockRef.current = false;
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
    if (deleteLockRef.current) return;
    deleteLockRef.current = true;
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
      deleteLockRef.current = false;
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

  // Inline editing handlers
  const startEditing = (tx: Transaction, field: EditableField) => {
    if (inlineSaving) return;
    const val = field === 'debit' || field === 'credit' || field === 'sr'
      ? (tx[field] > 0 ? tx[field].toString() : '')
      : (tx[field] || '');
    setEditingCell({ rowId: tx.id, field });
    setEditValue(val.toString());
  };

  const saveInlineEdit = async () => {
    if (!editingCell || inlineSaving) return;
    const tx = transactions.find(t => t.id === editingCell.rowId);
    if (!tx) { setEditingCell(null); return; }

    const { field } = editingCell;
    const oldVal = field === 'debit' || field === 'credit' || field === 'sr'
      ? (tx[field] > 0 ? tx[field].toString() : '')
      : (tx[field] || '');

    if (editValue.trim() === oldVal.toString()) {
      setEditingCell(null);
      return;
    }

    setInlineSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (field === 'debit' || field === 'credit' || field === 'sr') {
        const numVal = parseFloat(editValue) || 0;
        if (numVal < 0) { toast.error('Negative values not allowed'); setInlineSaving(false); return; }
        payload[field] = numVal;
      } else {
        payload[field] = editValue.trim();
      }

      await transactionAPI.update(tx.id, payload);
      setEditingCell(null);
      await loadTransactions();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setInlineSaving(false);
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingCell(null);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      saveInlineEdit();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentTx = transactions.find(t => t.id === editingCell?.rowId);
      if (!currentTx || !editingCell) return;

      // Save current cell first
      saveInlineEdit();

      const currentIdx = FIELD_ORDER.indexOf(editingCell.field);
      const txIdx = transactions.indexOf(currentTx);

      if (e.shiftKey) {
        // Shift+Tab: move to previous field or previous row's last field
        if (currentIdx > 0) {
          startEditing(currentTx, FIELD_ORDER[currentIdx - 1]);
        } else if (txIdx > 0) {
          startEditing(transactions[txIdx - 1], FIELD_ORDER[FIELD_ORDER.length - 1]);
        }
      } else {
        // Tab: move to next field or next row's first field
        if (currentIdx < FIELD_ORDER.length - 1) {
          startEditing(currentTx, FIELD_ORDER[currentIdx + 1]);
        } else if (txIdx < transactions.length - 1) {
          startEditing(transactions[txIdx + 1], FIELD_ORDER[0]);
        }
      }
    }
  };

  const renderCell = (tx: Transaction, field: EditableField) => {
    const isEditing = editingCell?.rowId === tx.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          ref={editInputRef}
          className="ledger__inline-input"
          type={field === 'date' ? 'date' : field === 'debit' || field === 'credit' || field === 'sr' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveInlineEdit}
          onKeyDown={handleInlineKeyDown}
          min={field === 'debit' || field === 'credit' || field === 'sr' ? '0' : undefined}
          step={field === 'debit' || field === 'credit' || field === 'sr' ? '0.01' : undefined}
        />
      );
    }

    return null;
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
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              (Click any cell to edit inline)
            </span>
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
                    <tr key={tx.id} className={editingCell?.rowId === tx.id ? 'ledger__row--editing' : ''}>
                      <td
                        className={`ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'date' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'date')}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'date'
                          ? renderCell(tx, 'date')
                          : formatDate(tx.date)
                        }
                      </td>
                      <td
                        className={`ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'partyName' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'partyName')}
                        style={{ fontStyle: tx.partyName ? 'normal' : 'italic', color: tx.partyName ? '#1A150D' : '#8B7D5E' }}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'partyName'
                          ? renderCell(tx, 'partyName')
                          : (tx.partyName || '\u2014')
                        }
                      </td>
                      <td
                        className={`ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'billNo' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'billNo')}
                        style={{ fontWeight: 600 }}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'billNo'
                          ? renderCell(tx, 'billNo')
                          : tx.billNo
                        }
                      </td>
                      <td
                        className={`ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'folio' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'folio')}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'folio'
                          ? renderCell(tx, 'folio')
                          : (tx.folio || '\u2014')
                        }
                      </td>
                      <td
                        className={`ledger__amount ledger__amount--debit ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'debit' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'debit')}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'debit'
                          ? renderCell(tx, 'debit')
                          : (tx.debit > 0 ? formatCurrency(tx.debit) : '')
                        }
                      </td>
                      <td
                        className={`ledger__amount ledger__amount--credit ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'credit' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'credit')}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'credit'
                          ? renderCell(tx, 'credit')
                          : (tx.credit > 0 ? formatCurrency(tx.credit) : '')
                        }
                      </td>
                      <td
                        className={`ledger__amount ledger__amount--sr ledger__cell--editable ${editingCell?.rowId === tx.id && editingCell?.field === 'sr' ? 'ledger__cell--active' : ''}`}
                        onClick={() => startEditing(tx, 'sr')}
                      >
                        {editingCell?.rowId === tx.id && editingCell?.field === 'sr'
                          ? renderCell(tx, 'sr')
                          : (tx.sr > 0 ? formatCurrency(tx.sr) : '')
                        }
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
                            title="Full Edit"
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
