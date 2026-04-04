'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { IconUser, IconKey, IconShield } from '@/components/icons/Icons';

export default function ProfilePage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === 'superadmin';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="settings">
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconUser size={22} /> Profile</h1>
          <p className="main__subtitle">Manage your account</p>
        </div>
      </div>

      <div className="settings__section">
        <h3 className="settings__section-title"><IconShield size={18} /> Account Information</h3>
        <div className="settings__field">
          <label className="settings__label">Email</label>
          <input type="text" value={admin?.email || ''} disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="settings__field">
          <label className="settings__label">Username</label>
          <input type="text" value={admin?.username || ''} disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="settings__field">
          <label className="settings__label">Role</label>
          <input type="text" value={isSuperAdmin ? 'Developer (Super Admin)' : 'Admin (Data Entry)'} disabled style={{ opacity: 0.6 }} />
        </div>
      </div>

      <div className="settings__section" style={{ marginTop: '2rem' }}>
        <h3 className="settings__section-title"><IconKey size={18} /> Change Password</h3>
        <div className="settings__field">
          <label className="settings__label">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>
        <div className="settings__field">
          <label className="settings__label">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="settings__field">
          <label className="settings__label">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />
        </div>
        <button
          className="settings__save"
          onClick={handlePasswordChange}
          disabled={changingPassword}
          style={{ background: 'var(--accent-orange)' }}
        >
          {changingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}
