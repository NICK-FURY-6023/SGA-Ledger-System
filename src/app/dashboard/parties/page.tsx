'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { partyAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  IconParty, IconPlus, IconEdit, IconTrash, IconSearch,
  IconClose, IconWarning, IconPhone, IconMapPin, IconPages,
  IconBookOpen, IconFileText,
} from '@/components/icons/Icons';

interface Party {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalPages: number;
  totalTransactions: number;
  totalBalance: number;
  createdBy: string;
  createdAt: string;
}

export default function PartiesPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New khata modal
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [editData, setEditData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteParty, setDeleteParty] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await partyAPI.getAll(params);
      setParties(data.parties || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createData.name.trim()) {
      setCreateError('Party name is required');
      return;
    }
    setSaving(true);
    try {
      await partyAPI.create({
        name: createData.name.trim(),
        phone: createData.phone.trim() || undefined,
        address: createData.address.trim() || undefined,
        notes: createData.notes.trim() || undefined,
      });
      toast.success('Khata created successfully');
      setShowCreate(false);
      setCreateData({ name: '', phone: '', address: '', notes: '' });
      await loadParties();
    } catch (err: any) {
      const msg = err.message || 'Failed to create khata';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (party: Party) => {
    setEditParty(party);
    setEditData({
      name: party.name,
      phone: party.phone || '',
      address: party.address || '',
      notes: party.notes || '',
    });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParty) return;
    setEditError('');
    if (!editData.name.trim()) {
      setEditError('Party name is required');
      return;
    }
    setEditSaving(true);
    try {
      await partyAPI.update(editParty.id, {
        name: editData.name.trim(),
        phone: editData.phone.trim() || undefined,
        address: editData.address.trim() || undefined,
        notes: editData.notes.trim() || undefined,
      });
      toast.success('Khata updated successfully');
      setEditParty(null);
      await loadParties();
    } catch (err: any) {
      const msg = err.message || 'Failed to update khata';
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteParty) return;
    setDeleting(true);
    try {
      await partyAPI.delete(deleteParty.id);
      toast.success('Khata deleted');
      setDeleteParty(null);
      await loadParties();
    } catch {
      toast.error('Failed to delete khata');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="main__header">
        <div>
          <h1 className="main__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconParty size={22} /> Parties / Customers
          </h1>
          <p className="main__subtitle">
            {total} khata{total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          className="ledger__add-btn"
          onClick={() => { setCreateData({ name: '', phone: '', address: '', notes: '' }); setCreateError(''); setShowCreate(true); }}
        >
          <IconPlus size={14} /> New Khata
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <IconSearch size={16} />
        </div>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 40px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div className="ledger__spinner" style={{ borderColor: 'var(--blue-primary)', borderTopColor: 'transparent', margin: '0 auto 1rem' }} />
          Loading...
        </div>
      ) : parties.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <IconBookOpen size={48} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {search ? 'No parties found matching your search.' : 'No parties yet. Click "New Khata" to add your first customer.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem',
        }}>
          {parties.map((party) => (
            <div
              key={party.id}
              onClick={() => router.push(`/dashboard/parties/${party.id}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
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
              {/* Action buttons */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(party); }}
                  title="Edit"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--blue-light)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }}
                >
                  <IconEdit size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteParty(party); }}
                  title="Delete"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,61,0,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,61,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }}
                >
                  <IconTrash size={14} />
                </button>
              </div>

              {/* Party name */}
              <h3 style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.6rem',
                paddingRight: '70px',
              }}>
                {party.name}
              </h3>

              {/* Phone & Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
                {party.phone && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconPhone size={13} /> {party.phone}
                  </span>
                )}
                {party.address && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconMapPin size={13} /> {party.address}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                padding: '0.75rem 0',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                marginBottom: '0.75rem',
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Pages</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--blue-light)' }}>{party.totalPages}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Transactions</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--orange-primary)' }}>{party.totalTransactions}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Balance</div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: party.totalBalance >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {formatCurrency(party.totalBalance)}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Created by {party.createdBy} on {formatDate(party.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Khata Modal */}
      {showCreate && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <form className="entry-form" onSubmit={handleCreate}>
            <div className="entry-form__title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconParty size={18} /> New Khata
              </span>
              <button type="button" className="entry-form__close" onClick={() => setShowCreate(false)}>
                <IconClose size={18} />
              </button>
            </div>

            {createError && (
              <div style={{
                marginBottom: '1rem',
                padding: '10px 14px',
                background: 'rgba(255,61,0,0.1)',
                border: '1px solid rgba(255,61,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}>
                {createError}
              </div>
            )}

            <div className="entry-form__grid">
              <div className="entry-form__field entry-form__field--full">
                <label className="entry-form__label">Party / Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                />
              </div>
              <div className="entry-form__field">
                <label className="entry-form__label">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Agra"
                  value={createData.address}
                  onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                />
              </div>
              <div className="entry-form__field entry-form__field--full">
                <label className="entry-form__label">Notes</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={createData.notes}
                  onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="entry-form__submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Khata'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Khata Modal */}
      {editParty && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setEditParty(null); }}>
          <form className="entry-form" onSubmit={handleEdit}>
            <div className="entry-form__title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconEdit size={18} /> Edit Khata
              </span>
              <button type="button" className="entry-form__close" onClick={() => setEditParty(null)}>
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
                {editSaving ? 'Saving...' : 'Update Khata'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteParty && (
        <div className="entry-modal" onClick={(e) => { if (e.target === e.currentTarget) setDeleteParty(null); }}>
          <div className="entry-form" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--orange-primary)' }}>
              <IconWarning size={48} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Delete Khata?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.3rem', fontSize: '0.95rem', fontWeight: 600 }}>
              {deleteParty.name}
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              This will permanently delete this party and all associated pages and transactions. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button className="ledger__filter-btn" onClick={() => setDeleteParty(null)}>
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 24px',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
                onClick={handleDelete}
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
