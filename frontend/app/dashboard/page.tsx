'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestIdRef = useRef(0);
  const [refreshClockTick, setRefreshClockTick] = useState(0);

  const loadDashboard = useCallback(async ({ withLoading = false, silentRefresh = false }: { withLoading?: boolean; silentRefresh?: boolean }) => {
    const requestId = ++requestIdRef.current;

    if (withLoading) {
      setLoading(true);
    }

    if (silentRefresh) {
      setIsRefreshing(true);
    }

    const [currencyResult, statsResult] = await Promise.allSettled([
      settingsApi.getWorkspaceCurrency(),
      ordersApi.getStatistics({ period: selectedRange }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    let resolvedCurrency = 'PKR';
    if (currencyResult.status === 'fulfilled') {
      resolvedCurrency = normalizeCurrencyCode(currencyResult.value.data?.currency || 'PKR');
    } else {
      console.error('Failed to load workspace currency', currencyResult.reason);
    }

    if (statsResult.status === 'fulfilled') {
      const stats = { ...(statsResult.value.data || {}), period: selectedRange };
      setDashboard(buildDashboardModel(stats, resolvedCurrency));
      setLastUpdatedAt(new Date());
    } else {
      console.error('Failed to load dashboard data', statsResult.reason);
      setDashboard(buildDashboardModel({ period: selectedRange }, resolvedCurrency));
    }

    setLoading(false);
    setIsRefreshing(false);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshClockTick((tick) => tick + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

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
      lastUpdatedLabel={formatUpdatedAt(lastUpdatedAt, refreshClockTick)}
    />
  );
}

function formatUpdatedAt(date: Date | null, tick: number) {
  if (!date) return 'Not synced yet';

  const now = Date.now() + tick * 0;
  const deltaSec = Math.max(0, Math.round((now - date.getTime()) / 1000));

  if (deltaSec < 10) return 'Updated just now';
  if (deltaSec < 60) return `Updated ${deltaSec}s ago`;

  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `Updated ${deltaMin}m ago`;

  const deltaHr = Math.round(deltaMin / 60);
  return `Updated ${deltaHr}h ago`;
}
