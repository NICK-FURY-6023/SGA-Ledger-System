'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shopName: '',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    sortOrder: 'newest',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await settingsAPI.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
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

      <div className="settings__section">
        <h3 className="settings__section-title">System Information</h3>
        <div className="settings__field">
          <label className="settings__label">Version</label>
          <input type="text" value="1.0.0" disabled style={{ opacity: 0.5 }} />
        </div>
        <div className="settings__field">
          <label className="settings__label">Default Admin Credentials</label>
          <input
            type="text"
            value="Username: admin / Password: admin123"
            disabled
            style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <button
        className="settings__save"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
