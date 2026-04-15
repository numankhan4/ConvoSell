'use client';

import { useEffect, useState, useRef } from 'react';
import { ordersApi, settingsApi } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import Link from 'next/link';
import { formatMoney, normalizeCurrencyCode } from '@/lib/currency';

export default function DashboardPage() {
  const { role } = usePermissions();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceCurrency, setWorkspaceCurrency] = useState('PKR');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWorkspaceCurrency();
    loadStats();

    // Poll stats less aggressively and only while tab is visible.
    pollingIntervalRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadStats();
    }, 20000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await ordersApi.getStatistics();
      setStats(response.data);
      if (response.data?.currency) {
        setWorkspaceCurrency(normalizeCurrencyCode(response.data.currency));
      }
    } catch (error) {
      console.error('Failed to load statistics', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceCurrency = async () => {
    try {
      const response = await settingsApi.getWorkspaceCurrency();
      setWorkspaceCurrency(normalizeCurrencyCode(response.data?.currency));
    } catch (error) {
      console.error('Failed to load workspace currency', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            role === 'owner' ? 'bg-purple-100 text-purple-800' :
            role === 'admin' ? 'bg-blue-100 text-blue-800' :
            role === 'manager' ? 'bg-green-100 text-green-800' :
            role === 'agent' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {role}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-600">Welcome back! Here's an overview of your store's performance.</p>
      </div>

      {/* Stats Grid - Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          change="All orders in system"
          trend="neutral"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          color="blue"
        />
        <PermissionGate 
          permission={Permissions.ANALYTICS_VIEW_REVENUE}
          fallback={
            <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-slate-300 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-400">••••••</p>
              <p className="text-xs text-gray-500 mt-2">Manager+ access required</p>
            </div>
          }
        >
          <StatCard
            title="Total Revenue"
            value={formatMoney(stats?.totalRevenue || 0, workspaceCurrency)}
            change="From confirmed + completed orders"
            trend="up"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
        </PermissionGate>
        <StatCard
          title="Confirmed Orders"
          value={stats?.confirmedOrders || 0}
          change="Customer confirmed"
          trend="up"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          change="Awaiting confirmation"
          trend="neutral"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
      </div>

      {/* Revenue Breakdown */}
      <PermissionGate permission={Permissions.ANALYTICS_VIEW_REVENUE}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Expected Revenue</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatMoney(stats?.expectedRevenue || 0, workspaceCurrency)}</p>
            <p className="text-xs text-slate-500 mt-1">Confirmed + Completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Realized Revenue</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatMoney(stats?.realizedRevenue || 0, workspaceCurrency)}</p>
            <p className="text-xs text-slate-500 mt-1">Completed only</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Pending Value</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatMoney(stats?.pendingValue || 0, workspaceCurrency)}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting confirmation</p>
          </div>
        </div>
      </PermissionGate>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Cancelled Orders</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats?.cancelledOrders || 0}</p>
              <p className="text-xs text-slate-500 mt-1">By customer or admin</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Completed Orders</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.completedOrders || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Successfully delivered</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.avgResponseTime ? `${Math.round(stats.avgResponseTime)}m` : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Customer reply time</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <Link
              href="/dashboard/inbox"
              className="block p-3 sm:p-4 border-2 border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-sm sm:text-base font-medium text-slate-900 group-hover:text-primary-700">View Inbox</div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1">Check new customer messages</div>
                </div>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link
              href="/dashboard/orders?status=pending"
              className="block p-3 sm:p-4 border-2 border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-sm sm:text-base font-medium text-slate-900 group-hover:text-primary-700">Pending Orders</div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1">Review orders awaiting confirmation</div>
                </div>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link
              href="/dashboard/automations"
              className="block p-3 sm:p-4 border-2 border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-sm sm:text-base font-medium text-slate-900 group-hover:text-primary-700">Setup Automations</div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1">Automate order confirmations</div>
                </div>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm p-4 sm:p-6 text-white">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Getting Started
          </h2>
          <p className="text-primary-100 text-xs sm:text-sm mb-4 sm:mb-6">Follow these steps to start verifying orders</p>
          <ol className="space-y-3 sm:space-y-4">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mr-2 sm:mr-3">1</span>
              <span className="text-primary-50 text-sm sm:text-base">Connect your WhatsApp Business account</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mr-2 sm:mr-3">2</span>
              <span className="text-primary-50 text-sm sm:text-base">Connect your Shopify store</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mr-2 sm:mr-3">3</span>
              <span className="text-primary-50 text-sm sm:text-base">Create your first automation workflow</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mr-2 sm:mr-3">4</span>
              <span className="text-primary-50 text-sm sm:text-base">Start confirming orders automatically</span>
            </li>
          </ol>
          <button className="mt-4 sm:mt-6 w-full bg-white text-primary-600 font-medium py-2.5 sm:py-3 px-4 rounded-lg hover:bg-primary-50 active:scale-95 transition-all text-sm sm:text-base min-h-[44px]">
            Start Setup Guide
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: JSX.Element;
  color: 'blue' | 'primary' | 'amber' | 'yellow' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600',
    primary: 'bg-primary-500 text-primary-600',
    amber: 'bg-amber-500 text-amber-600',
    yellow: 'bg-yellow-500 text-yellow-600',
    green: 'bg-green-500 text-green-600',
    red: 'bg-red-500 text-red-600',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 break-words">{value}</p>
          {change && (
            <div className="flex items-center space-x-1">
              {trend && <span className="flex-shrink-0">{trendIcons[trend]}</span>}
              <span className={`text-[10px] sm:text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'} break-words`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={`${colorClasses[color].split(' ')[0]}/10 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${colorClasses[color].split(' ')[1]} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
