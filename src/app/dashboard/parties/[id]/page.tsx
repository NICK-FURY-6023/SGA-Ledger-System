'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { partyAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  IconParty, IconPages, IconPlus, IconEdit, IconClose, IconWarning,
  IconPhone, IconMapPin, IconLock, IconUnlock, IconClock,
  IconChevronLeft, IconFileText, IconBookOpen, IconCreditIn, IconDebitOut,
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

interface Page {
  id: string;
  pageNumber: number;
  title: string;
  status: 'open' | 'closed';
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
  totalDebit: number;
  totalCredit: number;
  totalSR: number;
  createdBy: string;
  createdAt: string;
}

export default function PartyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAuth();
  const id = params.id as string;

  const [party, setParty] = useState<Party | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  // New page modal
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', openingBalance: '' });
  const [newPageError, setNewPageError] = useState('');
  const [newPageSaving, setNewPageSaving] = useState(false);

  // Edit party modal
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Close page confirmation
  const [closingPage, setClosingPage] = useState<Page | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const loadParty = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partyAPI.getById(id);
      setParty(data.party);
      setPages(data.pages || []);
    } catch {
      toast.error('Failed to load party details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadParty();
  }, [loadParty]);

  const openEditModal = () => {
    if (!party) return;
    setEditData({
      name: party.name,
      phone: party.phone || '',
      address: party.address || '',
      notes: party.notes || '',
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    if (!editData.name.trim()) {
      setEditError('Party name is required');
      return;
    }
    setEditSaving(true);
    try {
      await partyAPI.update(id, {
        name: editData.name.trim(),
        phone: editData.phone.trim() || undefined,
        address: editData.address.trim() || undefined,
        notes: editData.notes.trim() || undefined,
      });
      toast.success('Party updated successfully');
      setShowEdit(false);
      await loadParty();
    } catch (err: any) {
      const msg = err.message || 'Failed to update party';
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleNewPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPageError('');
    const ob = newPageData.openingBalance ? parseFloat(newPageData.openingBalance) : 0;
    if (newPageData.openingBalance && isNaN(ob)) {
      setNewPageError('Please enter a valid opening balance');
      return;
    }
    setNewPageSaving(true);
    try {
      await partyAPI.createPage(id, {
        title: newPageData.title.trim() || undefined,
        openingBalance: ob,
      });
      toast.success('Page created successfully');
      setShowNewPage(false);
      setNewPageData({ title: '', openingBalance: '' });
      await loadParty();
    } catch (err: any) {
      const msg = err.message || 'Failed to create page';
      setNewPageError(msg);
      toast.error(msg);
    } finally {
      setNewPageSaving(false);
    }
  };

  const handleClosePage = async () => {
    if (!closingPage) return;
    setCloseLoading(true);
    try {
      await partyAPI.closePage(id, closingPage.id);
      toast.success('Page closed successfully');
      setClosingPage(null);
      await loadParty();
    } catch (err: any) {
      toast.error(err.message || 'Failed to close page');
    } finally {
      setCloseLoading(false);
    }
  };

  // Compute totals from pages
  const totalBalance = pages.reduce((s, p) => s + p.closingBalance, 0);
  const totalDebit = pages.reduce((s, p) => s + p.totalDebit, 0);
  const totalCredit = pages.reduce((s, p) => s + p.totalCredit, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <div className="ledger__spinner" style={{ borderColor: 'var(--blue-primary)', borderTopColor: 'transparent', margin: '0 auto 1rem' }} />
        Loading...
      </div>
    );
  }

  if (!party) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}><IconWarning size={48} /></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Party not found.</p>
        <Link href="/dashboard/parties" style={{ color: 'var(--blue-light)', fontSize: '0.9rem', marginTop: '1rem', display: 'inline-block' }}>
          <IconChevronLeft size={14} /> Back to Parties
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/parties"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
      >
        <IconChevronLeft size={14} /> Back to Parties
      </Link>

      {/* Party Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <IconParty size={22} /> {party.name}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {party.phone && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconPhone size={14} /> {party.phone}
                </span>
              )}
              {party.address && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconMapPin size={14} /> {party.address}
                </span>
              )}
              {party.notes && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconFileText size={14} /> {party.notes}
                </span>
              )}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconClock size={13} /> Created by {party.createdBy} on {formatDate(party.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={openEditModal}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <IconEdit size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats">
        <div className="stat-card">
          <div className="stat-card__label">Total Balance</div>
          <div className={`stat-card__value ${totalBalance >= 0 ? 'stat-card__value--green' : 'stat-card__value--red'}`}>
            {formatCurrency(totalBalance)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Debit</div>
          <div className="stat-card__value stat-card__value--red">
            {formatCurrency(totalDebit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Credit</div>
          <div className="stat-card__value stat-card__value--green">
            {formatCurrency(totalCredit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Pages</div>
          <div className="stat-card__value stat-card__value--blue">
            {pages.length}
          </div>
        </div>
      </div>

      {/* Ledger Pages Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconPages size={18} /> Ledger Pages
        </h2>
        <button
          className="ledger__add-btn"
          onClick={() => { setNewPageData({ title: '', openingBalance: '' }); setNewPageError(''); setShowNewPage(true); }}
        >
          <IconPlus size={14} /> New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <IconBookOpen size={48} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            No pages yet. Click &quot;New Page&quot; to create the first ledger page.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem',
        }}>
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => router.push(`/dashboard/parties/${id}/pages/${page.id}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--blue-primary)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-blue)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
              }}
            >
              {/* Page title + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Page {page.pageNumber} {page.title ? `\u2014 ${page.title}` : ''}
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  background: page.status === 'open' ? 'rgba(0,200,83,0.12)' : 'rgba(255,61,0,0.12)',
                  color: page.status === 'open' ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${page.status === 'open' ? 'rgba(0,200,83,0.3)' : 'rgba(255,61,0,0.3)'}`,
                }}>
                  {page.status === 'open' ? <IconUnlock size={11} /> : <IconLock size={11} />}
                  {page.status === 'open' ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '0.8rem',
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Transactions: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{page.transactionCount}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Opening: <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{formatCurrency(page.openingBalance)}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <IconDebitOut size={11} /> Debit: <span style={{ color: 'var(--danger)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{formatCurrency(page.totalDebit)}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <IconCreditIn size={11} /> Credit: <span style={{ color: 'var(--success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{formatCurrency(page.totalCredit)}</span>
                </div>
              </div>

              {/* Closing Balance */}
              <div style={{
                padding: '0.6rem 0',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Closing Balance</span>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: page.closingBalance >= 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {formatCurrency(page.closingBalance)}
                </span>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.6rem',
                borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <IconClock size={11} /> {formatDate(page.createdAt)} by {page.createdBy}
                </span>
                {page.status === 'open' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setClosingPage(page); }}
                    style={{
                      padding: '4px 12px',
                      background: 'rgba(255,140,0,0.1)',
                      border: '1px solid rgba(255,140,0,0.3)',
                      borderRadius: '4px',
                      color: 'var(--orange-primary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <IconLock size={11} /> Close Page
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Page Modal */}
      {showNewPage && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setShowNewPage(false); }}>
          <form className="entry-form" onSubmit={handleNewPage} style={{ maxWidth: '420px' }}>
            <div className="entry-form__title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconPages size={18} /> New Page
              </span>
              <button type="button" className="entry-form__close" onClick={() => setShowNewPage(false)}>
                <IconClose size={18} />
              </button>
            </div>

            {newPageError && (
              <div style={{
                marginBottom: '1rem',
                padding: '10px 14px',
                background: 'rgba(255,61,0,0.1)',
                border: '1px solid rgba(255,61,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}>
                {newPageError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="entry-form__field">
                <label className="entry-form__label">Title (optional)</label>
                <input
                  type="text"
                  placeholder={`e.g. Opening Stock`}
                  value={newPageData.title}
                  onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Opening Balance</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newPageData.openingBalance}
                  onChange={(e) => setNewPageData({ ...newPageData, openingBalance: e.target.value })}
                />
              </div>
              <button type="submit" className="entry-form__submit" disabled={newPageSaving}>
                {newPageSaving ? 'Creating...' : 'Create Page'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Party Modal */}
      {showEdit && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <form className="entry-form" onSubmit={handleEditSubmit}>
            <div className="entry-form__title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconEdit size={18} /> Edit Party
              </span>
              <button type="button" className="entry-form__close" onClick={() => setShowEdit(false)}>
                <IconClose size={18} />
              </button>
            </div>

            {editError && (
              <div style={{
                marginBottom: '1rem',
                padding: '10px 14px',
                background: 'rgba(255,61,0,0.1)',
                border: '1px solid rgba(255,61,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}>
                {editError}
              </div>
            )}

            <div className="entry-form__grid">
              <div className="entry-form__field entry-form__field--full">
                <label className="entry-form__label">Party / Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Agra"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="entry-form__field entry-form__field--full">
                <label className="entry-form__label">Notes</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="entry-form__submit" disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Update Party'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Close Page Confirmation */}
      {closingPage && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setClosingPage(null); }}>
          <div className="entry-form" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--orange-primary)' }}>
              <IconWarning size={48} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Close Page {closingPage.pageNumber}?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              Once closed, no new entries can be added to this page. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button className="ledger__filter-btn" onClick={() => setClosingPage(null)}>
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 24px',
                  background: 'var(--orange-primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
                onClick={handleClosePage}
                disabled={closeLoading}
              >
                {closeLoading ? 'Closing...' : 'Close Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
