'use client';

import { useCallback, useEffect, useState } from 'react';
import { ordersApi, settingsApi } from '@/lib/api';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { normalizeCurrencyCode } from '@/lib/currency';
import { DashboardLoading, DashboardView } from '@/components/dashboard/DashboardView';
import { buildDashboardModel, type DashboardModel, type DashboardRange } from '@/components/dashboard/dashboard-model';

export default function DashboardPage() {
  const { role } = usePermissions();
  const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DashboardRange>('7d');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async ({ withLoading = false, silentRefresh = false }: { withLoading?: boolean; silentRefresh?: boolean }) => {
    let resolvedCurrency = 'PKR';

    if (withLoading) {
      setLoading(true);
    }

    if (silentRefresh) {
      setIsRefreshing(true);
    }

    try {
      const currencyResponse = await settingsApi.getWorkspaceCurrency();
      resolvedCurrency = normalizeCurrencyCode(currencyResponse.data?.currency || 'PKR');
    } catch (error) {
      console.error('Failed to load workspace currency', error);
    }

    try {
      const statsResponse = await ordersApi.getStatistics({ period: selectedRange });
      const stats = { ...(statsResponse.data || {}), period: selectedRange };
      setDashboard(buildDashboardModel(stats, resolvedCurrency));
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      setDashboard(buildDashboardModel({ period: selectedRange }, resolvedCurrency));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    void loadDashboard({ withLoading: true });
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadDashboard({ silentRefresh: true });
    }, 60000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  if (loading) {
    return <DashboardLoading />;
  }

  if (!dashboard) {
    return <DashboardLoading />;
  }

  return (
    <DashboardView
      role={role}
      dashboard={dashboard}
      selectedRange={selectedRange}
      onRangeChange={setSelectedRange}
      onRefresh={() => {
        void loadDashboard({ silentRefresh: true });
      }}
      isRefreshing={isRefreshing}
      lastUpdatedLabel={formatUpdatedAt(lastUpdatedAt)}
    />
  );
}

function formatUpdatedAt(date: Date | null) {
  if (!date) return 'Not synced yet';

  const now = Date.now();
  const deltaSec = Math.max(0, Math.round((now - date.getTime()) / 1000));

  if (deltaSec < 10) return 'Updated just now';
  if (deltaSec < 60) return `Updated ${deltaSec}s ago`;

  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `Updated ${deltaMin}m ago`;

  const deltaHr = Math.round(deltaMin / 60);
  return `Updated ${deltaHr}h ago`;
}
