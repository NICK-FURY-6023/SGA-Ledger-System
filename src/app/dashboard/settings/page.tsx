'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { IconSettings } from '@/components/icons/Icons';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shopName: '',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    sortOrder: 'newest',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div className="settings">
      <div className="main__header">
        <div>
          <h1 className="main__title"><IconSettings size={22} /> Settings</h1>
          <p className="main__subtitle">System configuration (Developer only)</p>
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
            <option value="INR">INR (Indian Rupee)</option>
            <option value="USD">$ USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
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
        <h3 className="settings__section-title">System Information</h3>
        <div className="settings__field">
          <label className="settings__label">Version</label>
          <input type="text" value="1.0.0" disabled style={{ opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}
