'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';

type CartRecoverySettings = {
  enabled: boolean;
  firstReminderHours: number;
  secondReminderHours: number;
  maxReminders: number;
  minCartValue: number;
};

const DEFAULT_SETTINGS: CartRecoverySettings = {
  enabled: true,
  firstReminderHours: 24,
  secondReminderHours: 48,
  maxReminders: 2,
  minCartValue: 0,
};

export function CartRecoverySettingsTab() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<CartRecoverySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await settingsApi.getCartRecoverySettings(token);
      setSettings({
        enabled: data.enabled,
        firstReminderHours: data.firstReminderHours,
        secondReminderHours: data.secondReminderHours,
        maxReminders: data.maxReminders,
        minCartValue: Number(data.minCartValue || 0),
      });
    } catch (error: any) {
      console.error('Failed to load cart recovery settings', error);
      toast.error(error.response?.data?.message || 'Failed to load cart recovery settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (settings.firstReminderHours >= settings.secondReminderHours) {
      toast.error('First reminder must be earlier than second reminder');
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsApi.updateCartRecoverySettings(token, settings);
      setSettings({
        enabled: updated.enabled,
        firstReminderHours: updated.firstReminderHours,
        secondReminderHours: updated.secondReminderHours,
        maxReminders: updated.maxReminders,
        minCartValue: Number(updated.minCartValue || 0),
      });
      toast.success('Cart recovery settings saved');
    } catch (error: any) {
      console.error('Failed to save cart recovery settings', error);
      toast.error(error.response?.data?.message || 'Failed to save cart recovery settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-5 w-56 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Cart Recovery</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure abandoned-cart WhatsApp reminders to recover pending revenue.
        </p>
      </div>

      <label className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
        <div>
          <div className="font-medium text-slate-900">Enable cart recovery</div>
          <div className="text-xs text-slate-600">Send WhatsApp reminders for abandoned carts</div>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
          className="h-4 w-4"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First reminder after (hours)</label>
          <input
            type="number"
            min={1}
            max={168}
            value={settings.firstReminderHours}
            onChange={(e) => setSettings((prev) => ({ ...prev, firstReminderHours: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Recommended: 24</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Second reminder after (hours)</label>
          <input
            type="number"
            min={1}
            max={336}
            value={settings.secondReminderHours}
            onChange={(e) => setSettings((prev) => ({ ...prev, secondReminderHours: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Recommended: 48</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Max reminders</label>
          <select
            value={settings.maxReminders}
            onChange={(e) => setSettings((prev) => ({ ...prev, maxReminders: Number(e.target.value) }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={0}>0 (disabled)</option>
            <option value={1}>1 reminder</option>
            <option value={2}>2 reminders</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Minimum cart value</label>
          <input
            type="number"
            min={0}
            value={settings.minCartValue}
            onChange={(e) => setSettings((prev) => ({ ...prev, minCartValue: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Only recover carts above this amount</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Cart reminders run via worker every 5 minutes and consume your WhatsApp messaging quota.
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Cart Recovery Settings'}
        </button>
      </div>
    </form>
  );
}
