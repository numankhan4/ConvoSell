'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/auth';
import { settingsApi } from '@/lib/api/settings';

type VerificationSettings = {
  enabled: boolean;
  scope: 'cod_only' | 'all_orders';
  firstFollowupMinutes: number;
  finalTimeoutMinutes: number;
  maxFollowups: number;
  readAwareEscalation: boolean;
};

const DEFAULT_SETTINGS: VerificationSettings = {
  enabled: true,
  scope: 'cod_only',
  firstFollowupMinutes: 120,
  finalTimeoutMinutes: 1440,
  maxFollowups: 2,
  readAwareEscalation: true,
};

export function OrderVerificationSettingsTab() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<VerificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await settingsApi.getOrderVerificationSettings(token);
      setSettings({
        enabled: data.enabled,
        scope: data.scope,
        firstFollowupMinutes: data.firstFollowupMinutes,
        finalTimeoutMinutes: data.finalTimeoutMinutes,
        maxFollowups: data.maxFollowups,
        readAwareEscalation: data.readAwareEscalation,
      });
    } catch (error: any) {
      console.error('Failed to load order verification settings', error);
      setLoadError('Unable to load verification settings right now.');
      toast.error(error.response?.data?.message || 'Failed to load order verification settings');
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

    if (settings.firstFollowupMinutes >= settings.finalTimeoutMinutes) {
      toast.error('First follow-up must be earlier than final timeout');
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsApi.updateOrderVerificationSettings(token, settings);
      setSettings({
        enabled: updated.enabled,
        scope: updated.scope,
        firstFollowupMinutes: updated.firstFollowupMinutes,
        finalTimeoutMinutes: updated.finalTimeoutMinutes,
        maxFollowups: updated.maxFollowups,
        readAwareEscalation: updated.readAwareEscalation,
      });
      toast.success('Order verification settings saved');
    } catch (error: any) {
      console.error('Failed to save order verification settings', error);
      toast.error(error.response?.data?.message || 'Failed to save order verification settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-6 w-64 bg-slate-200 rounded"></div>
        <div className="space-y-3">
          <div className="h-12 bg-slate-100 rounded-lg"></div>
          <div className="h-12 bg-slate-100 rounded-lg"></div>
          <div className="h-12 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4">
          <p className="text-sm text-danger-800">{loadError}</p>
          <button
            type="button"
            onClick={loadSettings}
            className="mt-3 rounded-lg border border-danger-300 bg-white px-3 py-1.5 text-xs font-semibold text-danger-800 hover:bg-danger-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Order Verification Engine</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure follow-up timing and timeout behavior for order confirmation workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
          <div>
            <div className="font-medium text-slate-900">Enable verification</div>
            <div className="text-xs text-slate-600">Turn follow-up and timeout automation on/off</div>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
          <div>
            <div className="font-medium text-slate-900">Read-aware escalation</div>
            <div className="text-xs text-slate-600">Adjust reminder tone if message is read</div>
          </div>
          <input
            type="checkbox"
            checked={settings.readAwareEscalation}
            onChange={(e) => setSettings((prev) => ({ ...prev, readAwareEscalation: e.target.checked }))}
            className="h-4 w-4"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Order scope</label>
          <select
            value={settings.scope}
            onChange={(e) => setSettings((prev) => ({ ...prev, scope: e.target.value as 'cod_only' | 'all_orders' }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="cod_only">COD orders only</option>
            <option value="all_orders">All orders</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Max follow-ups</label>
          <select
            value={settings.maxFollowups}
            onChange={(e) => setSettings((prev) => ({ ...prev, maxFollowups: Number(e.target.value) }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={0}>0 (disabled)</option>
            <option value={1}>1 follow-up</option>
            <option value={2}>2 follow-ups</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First follow-up after (minutes)</label>
          <input
            type="number"
            min={15}
            max={1440}
            value={settings.firstFollowupMinutes}
            onChange={(e) => setSettings((prev) => ({ ...prev, firstFollowupMinutes: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Recommended: 120 (2 hours)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Final timeout after (minutes)</label>
          <input
            type="number"
            min={60}
            max={10080}
            value={settings.finalTimeoutMinutes}
            onChange={(e) => setSettings((prev) => ({ ...prev, finalTimeoutMinutes: Number(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Recommended: 1440 (24 hours)</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Follow-up checks run every 5 minutes in the worker. After timeout, unresponsive pending orders are marked as fake-suspected.
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
