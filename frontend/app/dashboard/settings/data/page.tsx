'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import { settingsApi } from '@/lib/api/settings';
import { crmApi, ordersApi } from '@/lib/api';
import { PermissionGate, RoleGate } from '@/components/PermissionGate';
import ExportConfirmModal from '@/components/ExportConfirmModal';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';

interface DeletedIntegration {
  id: string;
  type: 'whatsapp' | 'shopify';
  name: string;
  deletedAt: string;
  deletedBy: string;
  gracePeriodEnds: string;
  daysRemaining: number;
  canRestore: boolean;
}

interface DataStats {
  contacts: number;
  conversations: number;
  messages: number;
  orders: number;
}

export default function DataManagementPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { role, isOwner, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [deletedIntegrations, setDeletedIntegrations] = useState<DeletedIntegration[]>([]);
  const [dataStats, setDataStats] = useState<DataStats>({
    contacts: 0,
    conversations: 0,
    messages: 0,
    orders: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'all' | 'messages' | 'contacts' | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<{ resource: 'contacts' | 'orders'; format: 'csv' | 'json' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Create GET /api/settings/deleted-integrations endpoint
      // TODO: Create GET /api/data/stats endpoint
      
      // Mock data for now
      setDeletedIntegrations([]);
      setDataStats({
        contacts: 0,
        conversations: 0,
        messages: 0,
        orders: 0,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data management information');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (integration: DeletedIntegration) => {
    if (!confirm(`Are you sure you want to restore this ${integration.type === 'whatsapp' ? 'WhatsApp' : 'Shopify'} integration?`)) {
      return;
    }

    try {
      setLoading(true);
      if (integration.type === 'whatsapp') {
        await settingsApi.restoreWhatsAppIntegration(integration.id);
        toast.success('WhatsApp integration restored successfully');
      } else {
        await settingsApi.restoreShopifyStore(integration.id);
        toast.success('Shopify store restored successfully');
      }
      await loadData();
      router.push('/dashboard/settings');
    } catch (error: any) {
      console.error('Failed to restore integration:', error);
      toast.error(error.response?.data?.message || 'Failed to restore integration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!deleteType) return;

    try {
      setLoading(true);
      // TODO: Create DELETE /api/data/:type endpoint in backend
      // await dataApi.deleteData(deleteType);
      toast.success(`${deleteType === 'all' ? 'All data' : deleteType} deleted successfully`);
      setShowDeleteModal(false);
      setDeleteType(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete data:', error);
      toast.error('Failed to delete data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const handleExport = async (resource: 'contacts' | 'orders', format: 'csv' | 'json') => {
    const key = `${resource}-${format}`;
    try {
      setExporting(key);
      const response = resource === 'contacts'
        ? await crmApi.exportContacts(format)
        : await ordersApi.exportOrders(format);

      const exportBlob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
          });

      const timestamp = new Date().toISOString().slice(0, 10);
      downloadBlob(exportBlob, `${resource}-export-${timestamp}.${format}`);
      toast.success(`${resource === 'contacts' ? 'Contacts' : 'Orders'} exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to export ${resource}`;
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  const requestExport = (resource: 'contacts' | 'orders', format: 'csv' | 'json') => {
    setPendingExport({ resource, format });
  };

  const confirmExport = async () => {
    if (!pendingExport) return;
    await handleExport(pendingExport.resource, pendingExport.format);
    setPendingExport(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/settings/workspace')}
          className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          ← Back to Workspace Settings
        </button>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-800">Data Management</h1>
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
        <p className="text-gray-600">Manage your integrations and workspace data</p>
      </div>

      {/* Data Overview Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">{dataStats.contacts}</div>
            <div className="text-sm text-gray-600 mt-1">Contacts</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">{dataStats.conversations}</div>
            <div className="text-sm text-gray-600 mt-1">Conversations</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600">{dataStats.messages}</div>
            <div className="text-sm text-gray-600 mt-1">Messages</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">{dataStats.orders}</div>
            <div className="text-sm text-gray-600 mt-1">Orders</div>
          </div>
        </div>
      </div>

      {/* Deleted Integrations Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Disconnected Integrations</h2>
        <p className="text-gray-600 mb-4">
          Integrations that have been disconnected. You can restore them within their grace period.
        </p>

        {deletedIntegrations.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-600">No disconnected integrations</p>
            <p className="text-sm text-gray-500 mt-1">
              All your integrations are active
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        integration.type === 'whatsapp'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {integration.type === 'whatsapp' ? 'WhatsApp' : 'Shopify'}
                      </span>
                      {integration.canRestore && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Can Restore
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">{integration.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Disconnected: {formatDate(integration.deletedAt)}</p>
                      <p>
                        Grace period ends: {formatDate(integration.gracePeriodEnds)}
                        <span className="ml-2 text-xs font-medium text-orange-600">
                          ({integration.daysRemaining} days remaining)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    {integration.canRestore ? (
                      <RoleGate 
                        roles={['owner', 'admin']}
                        fallback={
                          <span className="text-xs text-gray-500 italic">Admin only</span>
                        }
                      >
                        <button
                          onClick={() => handleRestore(integration)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Restore
                        </button>
                      </RoleGate>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">
                        Grace period expired
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Cleanup Card */}
      <PermissionGate 
        permission={Permissions.WORKSPACE_DELETE}
        fallback={
          <div className="bg-gray-50 rounded-lg shadow-md border-2 border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Data Cleanup</h2>
            <p className="text-gray-500 mb-4">
              Owner-only feature: Permanently delete data from your workspace
            </p>
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">You need owner permissions to access this feature</span>
            </div>
          </div>
        }
      >
        <div className="bg-white rounded-lg shadow-md border-2 border-orange-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-orange-600 mb-2">Data Cleanup</h2>
          <p className="text-gray-600 mb-4">
            Permanently delete specific types of data from your workspace
          </p>
          <div className="space-y-3">
          <button
            onClick={() => {
              setDeleteType('messages');
              setShowDeleteModal(true);
            }}
            disabled={dataStats.messages === 0}
            className="w-full px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
          >
            <div className="font-semibold">Delete All Messages</div>
            <div className="text-sm">
              This will delete {dataStats.messages} messages but keep contacts and conversations
            </div>
          </button>
          <button
            onClick={() => {
              setDeleteType('contacts');
              setShowDeleteModal(true);
            }}
            disabled={dataStats.contacts === 0}
            className="w-full px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
          >
            <div className="font-semibold">Delete All Contacts</div>
            <div className="text-sm">
              This will delete {dataStats.contacts} contacts and their conversations
            </div>
        </button>
          <button
            onClick={() => {
              setDeleteType('all');
              setShowDeleteModal(true);
            }}
            disabled={dataStats.messages === 0 && dataStats.contacts === 0}
            className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
          >
            <div className="font-semibold">Delete All Data</div>
            <div className="text-sm">
              This will delete all messages, contacts, conversations, and orders (integrations will remain)
            </div>
          </button>
        </div>
      </div>
      </PermissionGate>

      {/* Export Data Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Export Data</h2>
        <p className="text-gray-600 mb-4">
          Download your workspace data in CSV or JSON format
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Data exports are permission controlled and recorded in audit logs.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <PermissionGate
            permission={Permissions.CONTACTS_EXPORT}
            fallback={
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
                Contacts export unavailable for your role.
              </div>
            }
          >
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800 mb-2">Contacts</p>
              <div className="flex gap-2">
                <button
                  onClick={() => requestExport('contacts', 'csv')}
                  disabled={exporting !== null}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'contacts-csv' ? 'Exporting...' : 'CSV'}
                </button>
                <button
                  onClick={() => requestExport('contacts', 'json')}
                  disabled={exporting !== null}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'contacts-json' ? 'Exporting...' : 'JSON'}
                </button>
              </div>
            </div>
          </PermissionGate>

          <PermissionGate
            permission={Permissions.ORDERS_EXPORT}
            fallback={
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
                Orders export unavailable for your role.
              </div>
            }
          >
            <div className="p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800 mb-2">Orders</p>
              <div className="flex gap-2">
                <button
                  onClick={() => requestExport('orders', 'csv')}
                  disabled={exporting !== null}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'orders-csv' ? 'Exporting...' : 'CSV'}
                </button>
                <button
                  onClick={() => requestExport('orders', 'json')}
                  disabled={exporting !== null}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'orders-json' ? 'Exporting...' : 'JSON'}
                </button>
              </div>
            </div>
          </PermissionGate>
        </div>
      </div>

      <ExportConfirmModal
        open={pendingExport !== null}
        resourceLabel={pendingExport?.resource === 'orders' ? 'Orders' : 'Contacts'}
        format={pendingExport?.format || 'csv'}
        loading={exporting !== null}
        onCancel={() => setPendingExport(null)}
        onConfirm={confirmExport}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Confirm Data Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-red-600">
                {deleteType === 'all'
                  ? 'all data'
                  : deleteType === 'messages'
                  ? 'all messages'
                  : 'all contacts'}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteType(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
