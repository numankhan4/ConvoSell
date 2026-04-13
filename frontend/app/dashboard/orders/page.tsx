'use client';

import { useEffect, useState, useRef } from 'react';
import { ordersApi, automationsApi, fraudApi } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import ExportConfirmModal from '@/components/ExportConfirmModal';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function OrdersPage() {
  const { role } = usePermissions();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<'csv' | 'json' | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState<any>(null);
  
  // Manual trigger modal
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);
  const [fraudSummaries, setFraudSummaries] = useState<Record<string, any>>({});
  const [checkingFraudId, setCheckingFraudId] = useState<string | null>(null);
  const [fraudReportLoading, setFraudReportLoading] = useState(false);
  const [fraudReportOpen, setFraudReportOpen] = useState(false);
  const [fraudReportData, setFraudReportData] = useState<any>(null);
  const [fraudDecisionFilter, setFraudDecisionFilter] = useState('all');
  const [checkingBatchFraud, setCheckingBatchFraud] = useState(false);

  const normalizeFraudSummary = (summary?: any) => {
    if (!summary) return null;

    const finalFraudScore =
      summary.final_fraud_score ?? summary.finalFraudScore ?? summary.score ?? null;
    const fraudDecision =
      summary.fraud_decision ?? summary.fraudDecision ?? summary.decision ?? null;
    const riskLevel =
      summary.risk_level ?? summary.riskLevel ?? summary.risk ?? null;
    const checkedAt =
      summary.checked_at ?? summary.checkedAt ?? summary.createdAt ?? null;

    if (finalFraudScore === null && !fraudDecision && !riskLevel) {
      return null;
    }

    return {
      final_fraud_score: finalFraudScore,
      fraud_decision: fraudDecision,
      risk_level: riskLevel,
      checked_at: checkedAt,
    };
  };

  const getOrderFraudSummary = (order: any) => {
    const stateSummary = normalizeFraudSummary(fraudSummaries[order.id]);
    if (stateSummary) return stateSummary;

    const directSummary = normalizeFraudSummary(order.fraudSummary);
    if (directSummary) return directSummary;

    const latestAssessment = Array.isArray(order.fraudAssessments)
      ? order.fraudAssessments[0]
      : null;
    return normalizeFraudSummary(latestAssessment);
  };

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Reset to page 1 when filter or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, itemsPerPage, fraudDecisionFilter]);

  // Load automations once on mount
  useEffect(() => {
    loadAutomations();
  }, []);

  // Main effect for loading orders and polling
  useEffect(() => {
    loadOrders();
    loadStatistics();

    // Poll less aggressively and only while tab is visible.
    pollingIntervalRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadOrders();
      loadStatistics();
    }, 15000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [statusFilter, currentPage, itemsPerPage, searchQuery]);

  const loadOrders = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      console.log('📊 Loading orders with params:', params);
      
      const response = await ordersApi.getOrders(params);
      const nextOrders = response.data.data || [];
      const nextMeta = response.data.meta;

      // Guard against stale page index (e.g., after filters/data changes).
      if (nextMeta && nextMeta.total > 0 && currentPage > nextMeta.totalPages) {
        setCurrentPage(Math.max(1, nextMeta.totalPages));
        return;
      }

      setOrders(nextOrders);
      setPaginationMeta(nextMeta);
      const persistedSummaries = nextOrders.reduce((acc: Record<string, any>, order: any) => {
        const normalized =
          normalizeFraudSummary(order.fraudSummary) ||
          normalizeFraudSummary(Array.isArray(order.fraudAssessments) ? order.fraudAssessments[0] : null);
        if (normalized) {
          acc[order.id] = normalized;
        }
        return acc;
      }, {});

      setFraudSummaries(persistedSummaries);
      await loadFraudSummaries(nextOrders, persistedSummaries);
      
      console.log('✅ Loaded', nextOrders.length, 'orders, total:', nextMeta?.total || 0);
    } catch (error) {
      console.error('Failed to load orders', error);
      toast.error('Unable to load orders. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFraudSummaries = async (orderList: any[], existingSummaries: Record<string, any>) => {
    try {
      const orderIds = orderList
        .map((order) => order.id)
        .filter((orderId) => Boolean(orderId) && !existingSummaries[orderId]);

      if (!orderIds.length) {
        return;
      }

      const response = await fraudApi.getSummaries(orderIds);
      setFraudSummaries((prev) => ({
        ...prev,
        ...(response.data?.summaries || {}),
      }));
    } catch (error) {
      console.error('Failed to load fraud summaries', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await ordersApi.getStatistics(params);
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to load statistics', error);
    }
  };

  const loadAutomations = async () => {
    try {
      const response = await automationsApi.getAutomations();
      setAutomations(response.data || []);
    } catch (error) {
      console.error('Failed to load automations', error);
    }
  };

  const handleManualTrigger = async (orderId: string, automationId?: string) => {
    setTriggering(true);
    try {
      const response = await automationsApi.executeManually(orderId, automationId);
      toast.success(response.data.message || 'Automation executed successfully!');
      setShowTriggerModal(false);
      setSelectedOrder(null);
      loadOrders(); // Reload to show updated confirmationSentAt
    } catch (error: any) {
      console.error('Failed to execute automation', error);
      toast.error(error.response?.data?.message || 'Failed to execute automation');
    } finally {
      setTriggering(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      fake: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFeedbackLabel = (reason: string | null | undefined) => {
    if (!reason) return '';
    const labels: any = {
      wrong_item: '❌ Wrong Item',
      changed_mind: '🤔 Changed Mind',
      price: '💰 Price Issue',
    };
    return labels[reason] || '';
  };

  const getShopifyOrderUrl = (order: any) => {
    if (order.shopifyStore?.shopDomain && order.externalOrderId) {
      return `https://${order.shopifyStore.shopDomain}/admin/orders/${order.externalOrderId}`;
    }
    return null;
  };

  const canSendConfirmation = (order: any) => {
    // Only allow sending confirmation for pending orders
    // Confirmed, cancelled, and completed orders should not be re-triggered
    return order.status === 'pending';
  };

  const getDisabledReason = (order: any) => {
    if (order.status === 'confirmed') return 'Order already confirmed by customer';
    if (order.status === 'cancelled') return 'Cannot send confirmation for cancelled orders';
    if (order.status === 'completed') return 'Order already completed';
    return '';
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportOrders = async (format: 'csv' | 'json') => {
    try {
      setExporting(format);
      const response = await ordersApi.exportOrders(format);
      const exportBlob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
          });

      const timestamp = new Date().toISOString().slice(0, 10);
      downloadBlob(exportBlob, `orders-export-${timestamp}.${format}`);
      toast.success(`Orders exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to export orders as ${format.toUpperCase()}`;
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  const requestExportOrders = (format: 'csv' | 'json') => {
    setPendingExportFormat(format);
  };

  const filteredOrders = orders.filter((order) => {
    if (fraudDecisionFilter === 'all') {
      return true;
    }

    const decision = getOrderFraudSummary(order)?.fraud_decision;
    if (fraudDecisionFilter === 'UNCHECKED') {
      return !decision;
    }

    return decision === fraudDecisionFilter;
  });

  const uncheckedVisibleOrderIds = filteredOrders
    .filter((order) => !getOrderFraudSummary(order)?.fraud_decision)
    .map((order) => order.id);

  const getFraudDecisionColor = (decision?: string) => {
    if (decision === 'BLOCK') return 'bg-red-100 text-red-700';
    if (decision === 'VERIFY') return 'bg-amber-100 text-amber-700';
    if (decision === 'APPROVE') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-600';
  };

  const handleCheckFraud = async (orderId: string) => {
    try {
      setCheckingFraudId(orderId);
      const response = await fraudApi.checkOrder({
        orderId,
        forceRecompute: true,
        includeGeo: false,
      });

      const result = response.data;
      setFraudSummaries((prev) => ({
        ...prev,
        [orderId]: {
          final_fraud_score: result.final_fraud_score,
          fraud_decision: result.fraud_decision,
          risk_level: result.risk_level,
          checked_at: result.checked_at,
        },
      }));

      toast.success(`Fraud score: ${result.final_fraud_score} (${result.fraud_decision})`);
    } catch (error: any) {
      console.error('Failed to check fraud', error);
      toast.error(error.response?.data?.message || 'Failed to run fraud check');
    } finally {
      setCheckingFraudId(null);
    }
  };

  const handleViewFraudReport = async (orderId: string) => {
    try {
      setFraudReportLoading(true);
      setFraudReportOpen(true);
      const response = await fraudApi.getReport(orderId);
      setFraudReportData(response.data);

      const latest = response.data?.latest;
      if (latest) {
        setFraudSummaries((prev) => ({
          ...prev,
          [orderId]: {
            final_fraud_score: latest.final_fraud_score,
            fraud_decision: latest.fraud_decision,
            risk_level: latest.risk_level,
            checked_at: latest.checked_at,
          },
        }));
      }
    } catch (error: any) {
      console.error('Failed to fetch fraud report', error);
      setFraudReportData(null);
      toast.error(error.response?.data?.message || 'No fraud report found for this order');
    } finally {
      setFraudReportLoading(false);
    }
  };

  const handleCheckVisibleUncheckedFraud = async () => {
    if (!uncheckedVisibleOrderIds.length) {
      toast('No unchecked orders in current view');
      return;
    }

    try {
      setCheckingBatchFraud(true);
      const response = await fraudApi.checkBatch({
        orderIds: uncheckedVisibleOrderIds,
        forceRecompute: true,
        includeGeo: false,
      });

      const payload = response.data || {};
      const nextSummaries: Record<string, any> = {};

      (payload.results || []).forEach((item: any) => {
        if (item.ok && item.result) {
          nextSummaries[item.orderId] = {
            final_fraud_score: item.result.final_fraud_score,
            fraud_decision: item.result.fraud_decision,
            risk_level: item.result.risk_level,
            checked_at: item.result.checked_at,
          };
        }
      });

      setFraudSummaries((prev) => ({
        ...prev,
        ...nextSummaries,
      }));

      toast.success(`Fraud checks completed: ${payload.success || 0} success, ${payload.failed || 0} failed`);
    } catch (error: any) {
      console.error('Batch fraud check failed', error);
      toast.error(error.response?.data?.message || 'Failed to run batch fraud check');
    } finally {
      setCheckingBatchFraud(false);
    }
  };

  const confirmExportOrders = async () => {
    if (!pendingExportFormat) return;
    await handleExportOrders(pendingExportFormat);
    setPendingExportFormat(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Orders</h1>
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
          <p className="text-sm sm:text-base text-slate-600">Track and manage your customer orders</p>
        </div>
        <PermissionGate permission={Permissions.ORDERS_EXPORT}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => requestExportOrders('csv')}
              disabled={exporting !== null}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => requestExportOrders('json')}
              disabled={exporting !== null}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <ExportConfirmModal
        open={pendingExportFormat !== null}
        resourceLabel="Orders"
        format={pendingExportFormat || 'csv'}
        loading={exporting !== null}
        onCancel={() => setPendingExportFormat(null)}
        onConfirm={confirmExportOrders}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by order #, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1 scrollbar-hide">
          {['all', 'pending', 'confirmed', 'cancelled', 'completed', 'fake'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg capitalize text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                statusFilter === status
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-500">Fraud:</span>
        {[
          { value: 'all', label: 'All' },
          { value: 'APPROVE', label: 'Approve' },
          { value: 'VERIFY', label: 'Verify' },
          { value: 'BLOCK', label: 'Block' },
          { value: 'UNCHECKED', label: 'Unchecked' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFraudDecisionFilter(item.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              fraudDecisionFilter === item.value
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={handleCheckVisibleUncheckedFraud}
          disabled={checkingBatchFraud || uncheckedVisibleOrderIds.length === 0}
          className="ml-2 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={uncheckedVisibleOrderIds.length > 0 ? 'Run fraud checks for visible unchecked orders' : 'No unchecked orders in current filter'}
        >
          {checkingBatchFraud
            ? 'Checking...'
            : `Check Visible Unchecked (${uncheckedVisibleOrderIds.length})`}
        </button>
      </div>

      {/* Summary Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{statistics.totalOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{statistics.pendingOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Confirmed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{statistics.confirmedOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Cancelled</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{statistics.cancelledOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-slate-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No orders found</h3>
          <p className="text-sm sm:text-base text-slate-600">Orders will appear here once your store starts receiving them</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => {
              const fraudSummary = getOrderFraudSummary(order);

              return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                {fraudSummary && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getFraudDecisionColor(fraudSummary.fraud_decision)}`}>
                      {fraudSummary.fraud_decision}
                    </span>
                    <span className="text-xs text-slate-600">
                      Score: <span className="font-semibold text-slate-900">{fraudSummary.final_fraud_score}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {getShopifyOrderUrl(order) ? (
                        <a
                          href={getShopifyOrderUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-semibold text-sm inline-flex items-center gap-1"
                          title="Open in Shopify Admin"
                        >
                          Order #{order.externalOrderNumber}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                        >
                          Order #{order.externalOrderNumber}
                        </Link>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      order.status
                    )}`}
                    title={order.status === 'cancelled' && order.feedbackReason ? `Reason: ${getFeedbackLabel(order.feedbackReason)}` : undefined}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Customer:</span>
                    <span className="text-slate-900 font-medium">{order.contact?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount:</span>
                    <span className="text-slate-900 font-semibold">{order.currency} {order.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      order.paymentMethod === 'cod' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.paymentMethod?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date:</span>
                    <span className="text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Confirmation:</span>
                    {order.confirmationSentAt ? (
                      <span className="flex items-center text-green-600 text-xs">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Sent
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Not sent</span>
                    )}
                  </div>
                </div>
                <PermissionGate 
                  permission={Permissions.ORDERS_CONFIRM}
                  fallback={
                    <div className="mt-3 w-full inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Confirmation Restricted
                    </div>
                  }
                >
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowTriggerModal(true);
                      }}
                      disabled={!canSendConfirmation(order)}
                      className={`inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg transition-colors ${
                        canSendConfirmation(order)
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                      title={canSendConfirmation(order) ? (order.confirmationSentAt ? 'Resend confirmation' : 'Send confirmation') : getDisabledReason(order)}
                    >
                      {order.confirmationSentAt ? 'Resend' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => handleCheckFraud(order.id)}
                      disabled={checkingFraudId === order.id}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingFraudId === order.id ? 'Checking...' : 'Check Fraud'}
                    </button>
                  </div>
                </PermissionGate>
                <button
                  onClick={() => handleViewFraudReport(order.id)}
                  className="mt-2 w-full inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  View Fraud Report
                </button>
              </div>
              );
            })}
          </div>

          {/* Pagination (Mobile) */}
          {paginationMeta && paginationMeta.total > 0 && (
            <div className="lg:hidden bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3">
                {/* Items info and per-page selector */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, paginationMeta.total)}-
                    {Math.min(currentPage * itemsPerPage, paginationMeta.total)} of {paginationMeta.total}
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value={10}>10/page</option>
                    <option value={20}>20/page</option>
                    <option value={50}>50/page</option>
                    <option value={100}>100/page</option>
                  </select>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    Page {currentPage} of {paginationMeta.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
                    disabled={currentPage === paginationMeta.totalPages}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      currentPage === paginationMeta.totalPages
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fraud
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Confirmation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const fraudSummary = getOrderFraudSummary(order);

                  return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getShopifyOrderUrl(order) ? (
                        <a
                          href={getShopifyOrderUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1.5 group"
                          title="Open in Shopify Admin"
                        >
                          {order.externalOrderNumber}
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {order.externalOrderNumber}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.contact?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {order.currency} {order.totalAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.paymentMethod === 'cod' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.paymentMethod?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-help ${getStatusColor(
                          order.status
                        )}`}
                        title={order.status === 'cancelled' && order.feedbackReason ? `Cancellation Reason: ${getFeedbackLabel(order.feedbackReason)}` : undefined}
                      >
                        {order.status === 'cancelled' && order.feedbackReason ? (
                          <span>{order.status} ℹ️</span>
                        ) : (
                          order.status
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {fraudSummary ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getFraudDecisionColor(fraudSummary.fraud_decision)}`}>
                            {fraudSummary.fraud_decision}
                          </span>
                          <span className="text-slate-700 font-medium">{fraudSummary.final_fraud_score}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Not checked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.confirmationSentAt ? (
                        <div className="flex items-center text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Sent
                        </div>
                      ) : (
                        <span className="text-slate-400">Not sent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <PermissionGate 
                        permission={Permissions.ORDERS_CONFIRM}
                        fallback={
                          <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Restricted
                          </span>
                        }
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowTriggerModal(true);
                            }}
                            disabled={!canSendConfirmation(order)}
                            className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              canSendConfirmation(order)
                                ? 'bg-primary-600 text-white hover:bg-primary-700'
                                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                            title={canSendConfirmation(order) ? (order.confirmationSentAt ? 'Resend confirmation' : 'Send confirmation') : getDisabledReason(order)}
                          >
                            {order.confirmationSentAt ? 'Resend' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleCheckFraud(order.id)}
                            disabled={checkingFraudId === order.id}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {checkingFraudId === order.id ? 'Checking...' : 'Check Fraud'}
                          </button>
                          <button
                            onClick={() => handleViewFraudReport(order.id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            Report
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          {/* Pagination */}
          {paginationMeta && paginationMeta.total > 0 && (
            <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Pagination Info */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-700">
                    Showing{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, paginationMeta.total)}
                    </span>
                    {' '}-{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, paginationMeta.total)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{paginationMeta.total}</span>
                    {' '}orders
                  </p>

                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="itemsPerPage" className="text-sm text-slate-600">
                      Per page:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginationMeta.totalPages) }, (_, i) => {
                      let pageNum;
                      if (paginationMeta.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= paginationMeta.totalPages - 2) {
                        pageNum = paginationMeta.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Current page indicator (mobile) */}
                  <div className="sm:hidden px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium">
                    Page {currentPage} of {paginationMeta.totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
                    disabled={currentPage === paginationMeta.totalPages}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentPage === paginationMeta.totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Next
                  </button>

                  <button
                    onClick={() => setCurrentPage(paginationMeta.totalPages)}
                    disabled={currentPage === paginationMeta.totalPages}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentPage === paginationMeta.totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {fraudReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Fraud Report</h3>
              <button
                onClick={() => {
                  setFraudReportOpen(false);
                  setFraudReportData(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {fraudReportLoading ? (
                <div className="py-8 text-center text-slate-600">Loading fraud report...</div>
              ) : fraudReportData?.latest ? (
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 ${
                    fraudReportData.latest.fraud_decision === 'BLOCK'
                      ? 'border-red-200 bg-red-50'
                      : fraudReportData.latest.fraud_decision === 'VERIFY'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-green-200 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Decision</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getFraudDecisionColor(fraudReportData.latest.fraud_decision)}`}>
                            {fraudReportData.latest.fraud_decision}
                          </span>
                          <span className="text-sm font-medium text-slate-800">
                            {fraudReportData.latest.fraud_decision === 'BLOCK'
                              ? 'Hold fulfillment and require manual verification.'
                              : fraudReportData.latest.fraud_decision === 'VERIFY'
                                ? 'Request OTP or confirm details before dispatch.'
                                : 'Low risk profile detected. Safe to continue.'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Checked At</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {new Date(fraudReportData.latest.checked_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Risk Score</p>
                      <p className="text-2xl font-bold text-slate-900">{fraudReportData.latest.final_fraud_score}</p>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          fraudReportData.latest.final_fraud_score >= 80
                            ? 'bg-red-500'
                            : fraudReportData.latest.final_fraud_score >= 50
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, fraudReportData.latest.final_fraud_score))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Risk level: <span className="font-semibold text-slate-700">{fraudReportData.latest.risk_level}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Explanation</p>
                    {(fraudReportData.latest.explanation || []).length > 0 ? (
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {(fraudReportData.latest.explanation || []).map((reason: string, idx: number) => (
                          <li key={`${reason}-${idx}`}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">No explanation available.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Signals</p>
                    {(fraudReportData.signals || []).length > 0 ? (
                      <div className="space-y-2">
                        {(fraudReportData.signals || []).map((signal: any) => (
                          <div key={signal.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">{signal.detectorName} / {signal.signalType}</span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">+{signal.scoreContribution}</span>
                            </div>
                            <p className="mt-1 text-slate-700">{signal.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No signals recorded.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-600">No fraud report available for this order yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Trigger Modal */}
      {showTriggerModal && selectedOrder && (
        <ManualTriggerModal
          order={selectedOrder}
          automations={automations}
          onClose={() => {
            setShowTriggerModal(false);
            setSelectedOrder(null);
          }}
          onTrigger={handleManualTrigger}
          triggering={triggering}
        />
      )}
    </div>
  );
}

// Manual Trigger Modal Component
function ManualTriggerModal({ 
  order, 
  automations, 
  onClose, 
  onTrigger,
  triggering 
}: { 
  order: any;
  automations: any[];
  onClose: () => void;
  onTrigger: (orderId: string, automationId?: string) => void;
  triggering: boolean;
}) {
  const [selectedAutomationId, setSelectedAutomationId] = useState<string>('');

  // Filter automations that match this order
  const matchingAutomations = automations.filter(auto => {
    if (!auto.isActive) return false;
    if (auto.trigger.type !== 'order_created' && auto.trigger.type !== 'order.created') return false;
    
    // Check conditions
    const conditions = auto.trigger.conditions;
    if (!conditions) return true; // No conditions = matches all
    
    if (conditions.paymentMethod && conditions.paymentMethod !== order.paymentMethod) {
      return false;
    }
    
    return true;
  });

  const handleSubmit = () => {
    onTrigger(order.id, selectedAutomationId || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Send Confirmation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Order #{order.externalOrderNumber} - {order.contact?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Order Summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Amount:</span>
              <span className="font-semibold text-slate-900">{order.currency} {order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Payment:</span>
              <span className="font-medium text-slate-900">{order.paymentMethod?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Status:</span>
              <span className="font-medium text-slate-900 capitalize">{order.status}</span>
            </div>
            {order.confirmationSentAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Previously sent:</span>
                <span className="text-green-600 font-medium">
                  {new Date(order.confirmationSentAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Automation Selection */}
          {matchingAutomations.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Automation {matchingAutomations.length === 1 && '(Auto-selected)'}
              </label>
              <select
                value={selectedAutomationId}
                onChange={(e) => setSelectedAutomationId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={matchingAutomations.length === 1}
              >
                {matchingAutomations.length === 1 && <option value="">Auto (First matching)</option>}
                {matchingAutomations.map(auto => (
                  <option key={auto.id} value={auto.id}>
                    {auto.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                {matchingAutomations.length} active automation(s) match this order
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium">No matching automations</p>
                  <p className="mt-1">
                    No active automations match this order's criteria. 
                    <Link href="/dashboard/automations" className="underline ml-1">
                      Create one first
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                Messages can only be sent within 24 hours of the customer's last interaction.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={triggering || matchingAutomations.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {triggering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Confirmation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
