'use client';

import { useState, useEffect } from 'react';
import { settingsAPI, authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shopName: '',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    sortOrder: 'newest',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      setSettings(data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div className="settings">
      <div className="main__header">
        <div>
          <h1 className="main__title">⚙️ Settings</h1>
          <p className="main__subtitle">Configure your ledger system</p>
        </div>
      </div>

      <div className="settings__section">
        <h3 className="settings__section-title">Shop Information</h3>
        <div className="settings__field">
          <label className="settings__label">Shop Name</label>
          <input
            type="text"
            value={settings.shopName}
            onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
          />
        </div>
      </div>

      <div className="settings__section">
        <h3 className="settings__section-title">Display Preferences</h3>
        <div className="settings__field">
          <label className="settings__label">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
          >
            <option value="INR">₹ INR (Indian Rupee)</option>
            <option value="USD">$ USD (US Dollar)</option>
            <option value="EUR">€ EUR (Euro)</option>
          </select>
        </div>
        <div className="settings__field">
          <label className="settings__label">Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div className="settings__field">
          <label className="settings__label">Default Sort Order</label>
          <select
            value={settings.sortOrder}
            onChange={(e) => setSettings({ ...settings, sortOrder: e.target.value })}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <button
        className="settings__save"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      <div className="settings__section" style={{ marginTop: '2rem' }}>
        <h3 className="settings__section-title">🔐 Change Password</h3>
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

      <div className="settings__section" style={{ marginTop: '2rem' }}>
        <h3 className="settings__section-title">System Information</h3>
        <div className="settings__field">
          <label className="settings__label">Version</label>
          <input type="text" value="1.0.0" disabled style={{ opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}
