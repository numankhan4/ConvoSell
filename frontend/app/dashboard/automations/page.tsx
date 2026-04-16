'use client';

import { useEffect, useState } from 'react';
import { automationsApi, settingsApi } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import toast from 'react-hot-toast';
import { normalizeCurrencyCode } from '@/lib/currency';

interface Automation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: {
    type: string;
    conditions?: any;
  };
  actions: Array<{
    type: string;
    template?: string;
    message?: string;
    useButtons?: boolean;
    tagId?: string;
    status?: string;
    delay?: number;
  }>;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

interface QuickAutomationPreset {
  key: string;
  icon: string;
  cardColorClass: string;
  title: string;
  description: string;
  name: string;
  triggerType: string;
  paymentMethod: string;
  template: string;
}

export default function AutomationsPage() {
  const { role } = usePermissions();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [workspaceCurrency, setWorkspaceCurrency] = useState('PKR');
  
  // Delete states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'multiple', id?: string }>({ type: 'single' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadWorkspaceCurrency();
    loadAutomations();
  }, []);

  const loadWorkspaceCurrency = async () => {
    try {
      const response = await settingsApi.getWorkspaceCurrency();
      setWorkspaceCurrency(normalizeCurrencyCode(response.data?.currency));
    } catch (error) {
      console.error('Failed to load workspace currency', error);
    }
  };

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const response = await automationsApi.getAutomations();
      setAutomations(response.data || []);
    } catch (error) {
      console.error('Failed to load automations', error);
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await automationsApi.toggleAutomation(id, isActive);
      toast.success(isActive ? 'Automation enabled' : 'Automation disabled');
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation', error);
      toast.error('Failed to update automation');
    }
  };

  const handleDeleteSingle = (id: string) => {
    setDeleteTarget({ type: 'single', id });
    setShowDeleteModal(true);
  };

  const handleDeleteMultiple = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select automations to delete');
      return;
    }
    setDeleteTarget({ type: 'multiple' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        await automationsApi.deleteAutomation(deleteTarget.id);
        toast.success('Automation deleted successfully');
      } else if (deleteTarget.type === 'multiple') {
        const response = await automationsApi.deleteMultiple(selectedIds);
        toast.success(response.data.message || 'Automations deleted successfully');
        setSelectedIds([]);
      }
      setShowDeleteModal(false);
      loadAutomations();
    } catch (error: any) {
      console.error('Failed to delete automation(s)', error);
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === automations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(automations.map(a => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getTriggerLabel = (trigger: any) => {
    const labels: Record<string, string> = {
      'order_created': 'New Order Created',
      'order.created': 'New Order Created',
      'cart_abandoned': 'Cart Abandoned',
      'cart.abandoned': 'Cart Abandoned',
      'message_received': 'Message Received',
      'no_reply': 'No Reply After X Hours',
    };
    return labels[trigger.type] || trigger.type;
  };

  const getActionLabel = (action: any) => {
    const labels: Record<string, string> = {
      'send_message': 'Send WhatsApp Message',
      'add_tag': 'Add Tag',
      'update_order_status': 'Update Order Status',
    };
    return labels[action.type] || action.type;
  };

  const getConditionText = (conditions: any) => {
    if (!conditions) return 'All orders';
    const parts = [];
    if (conditions.paymentMethod) {
      parts.push(`Payment: ${conditions.paymentMethod.toUpperCase()}`);
    }
    if (conditions.minAmount) {
      parts.push(`Min: ${conditions.minAmount}`);
    }
    if (conditions.status) {
      parts.push(`Status: ${conditions.status}`);
    }
    return parts.join(', ') || 'All orders';
  };

  const openCreateFromPreset = (preset: QuickAutomationPreset) => {
    setInitialFormData({
      name: preset.name,
      description: preset.description,
      triggerType: preset.triggerType,
      conditions: { paymentMethod: preset.paymentMethod },
      actions: [
        {
          type: 'send_message',
          template: preset.template,
          useButtons: false,
        },
      ],
    });
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
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
          <p className="text-sm text-slate-500">
            Automate order confirmations, reminders, and status updates
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <PermissionGate permission={Permissions.AUTOMATIONS_DELETE}>
              <button
                onClick={handleDeleteMultiple}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete {selectedIds.length} Selected
              </button>
            </PermissionGate>
          )}
          <PermissionGate permission={Permissions.AUTOMATIONS_CREATE}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Automation
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Info Banner - How Automations Work */}
      {automations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">How Automations Work</p>
              <p className="mt-1">
                Automations trigger automatically based on events (like new orders). They execute actions like sending WhatsApp messages, 
                adding tags, or updating order status. Toggle them on/off anytime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Automations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{automations.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {automations.filter(a => a.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Executions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {automations.reduce((sum, a) => sum + a.executionCount, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Templates (only show if no automations exist) */}
      {automations.length === 0 && !loading && (
        <PermissionGate permission={Permissions.AUTOMATIONS_CREATE}>
          <>
          {/* WhatsApp Restrictions Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">WhatsApp Messaging Window</p>
                <p className="mt-1">
                  You can only send messages to customers within 24 hours of their last interaction. 
                  After 24 hours, you must use approved message templates. Automations will respect this limit automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">🚀 Quick Start</h3>
            <p className="text-sm text-slate-600 mb-4">
              Get started with these popular automation templates for all Shopify payment types:
            </p>
            <AutomationQuickTemplatePicker
              onSelect={openCreateFromPreset}
              onSelectCustom={() => setShowCreateModal(true)}
            />
        </div>
        </>
        </PermissionGate>
      )}

      {/* Automations List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Your Automations</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading automations...</p>
          </div>
        ) : automations.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No automations yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Get started by creating your first automation to handle order confirmations and follow-ups.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Automation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            {automations.length > 0 && (
              <div className="flex items-center px-6 py-3 bg-slate-50 rounded-t-lg">
                <input
                  type="checkbox"
                  checked={selectedIds.length === automations.length && automations.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label className="ml-2 text-sm font-medium text-slate-700">
                  Select All ({automations.length})
                </label>
              </div>
            )}
            
            <div className="divide-y divide-slate-200">
              {automations.map((automation) => (
                <div
                  key={automation.id}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(automation.id)}
                      onChange={() => toggleSelect(automation.id)}
                      className="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    />

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{automation.name}</h3>
                        <span className={`
                          px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${automation.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'}
                        `}>
                          {automation.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {automation.description && (
                        <p className="mt-1 text-sm text-slate-600">{automation.description}</p>
                      )}

                      {/* Trigger */}
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center text-sm">
                          <span className="text-slate-500">Trigger:</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                            {getTriggerLabel(automation.trigger)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-slate-500">Conditions:</span>
                          <span className="ml-2 text-slate-700">
                            {getConditionText(automation.trigger.conditions)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3">
                        <p className="text-sm text-slate-500 mb-2">Actions:</p>
                        <div className="flex flex-wrap gap-2">
                          {automation.actions.map((action, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm"
                            >
                              {getActionLabel(action)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Executed {automation.executionCount} times
                        </div>
                        {automation.lastExecutedAt && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Last run: {new Date(automation.lastExecutedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAutomation(automation);
                        }}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <PermissionGate permission={Permissions.AUTOMATIONS_DELETE}>
                        <button
                          onClick={() => handleDeleteSingle(automation.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete automation"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.AUTOMATIONS_UPDATE}>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automation.isActive}
                            onChange={(e) => handleToggle(automation.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Automation Modal */}
      {showCreateModal && (
        <CreateAutomationModal
          initialData={initialFormData}
          workspaceCurrency={workspaceCurrency}
          onClose={() => {
            setShowCreateModal(false);
            setInitialFormData(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setInitialFormData(null);
            loadAutomations();
          }}
        />
      )}

      {/* View Details Modal */}
      {selectedAutomation && (
        <ViewAutomationModal
          automation={selectedAutomation}
          onClose={() => setSelectedAutomation(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 text-center">
                {deleteTarget.type === 'single' ? 'Delete Automation?' : `Delete ${selectedIds.length} Automations?`}
              </h3>
              <p className="mt-2 text-sm text-slate-600 text-center">
                {deleteTarget.type === 'single' 
                  ? 'This automation will be permanently deleted and cannot be recovered.'
                  : `You are about to delete ${selectedIds.length} automation${selectedIds.length !== 1 ? 's' : ''}. This action cannot be undone.`
                }
              </p>
              {deleteTarget.type === 'multiple' && selectedIds.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-slate-700 mb-2">Automations to delete:</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {automations
                      .filter(a => selectedIds.includes(a.id))
                      .map(a => (
                        <li key={a.id}>• {a.name}</li>
                      ))
                    }
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Template Examples
const MESSAGE_TEMPLATES = {
  cod_confirmation: `Hello {{customer_name}}! 👋

Thank you for your order #{{order_number}}!

📦 Order Total: {{order_total}}
💰 Payment Method: Cash on Delivery (COD)

Please reply with:
✅ YES to confirm your order
❌ NO to cancel

We'll deliver within 2-3 business days after confirmation.`,
  
  prepaid_confirmation: `Hi {{customer_name}}! 🎉

Your payment has been received! ✓

📦 Order #{{order_number}}
💵 Amount Paid: {{order_total}}

Your order is being processed and will be shipped soon. We'll keep you updated!`,
  
  cod_reminder: `Hi {{customer_name}},

This is a friendly reminder about your COD order #{{order_number}} ({{order_total}}).

We're waiting for your confirmation. Please reply:
✅ YES to confirm
❌ NO to cancel

Thank you!`,

  cart_recovery: `Hi {{customer_name}}! 👋

You left {{product_count}} item(s) in your cart worth {{cart_total}}.

Complete your order here: {{recovery_link}}

Need help? Just reply to this message.`,

  all_orders_welcome: `Hi {{customer_name}}! 🎉

Thank you for ordering from us!

📦 Order: #{{order_number}}
💵 Total: {{order_total}}

We've received your order and will process it shortly. You'll receive updates via WhatsApp.

Questions? Just reply to this message!`,

  shipment_notification: `Hi {{customer_name}}! 📦

Great news! Your order #{{order_number}} has been shipped!

We'll notify you once it's delivered. Track your order on our website.

Thank you for shopping with us!`,
};

const QUICK_AUTOMATION_PRESETS: QuickAutomationPreset[] = [
  {
    key: 'cod_confirmation',
    icon: '💰',
    cardColorClass: 'bg-green-100',
    title: 'COD Confirmation',
    description: 'Auto-confirm COD/fulfillment orders',
    name: 'COD Order Confirmation',
    triggerType: 'order_created',
    paymentMethod: 'cod',
    template: MESSAGE_TEMPLATES.cod_confirmation,
  },
  {
    key: 'prepaid_confirmation',
    icon: '💳',
    cardColorClass: 'bg-blue-100',
    title: 'Prepaid Thank You',
    description: 'Thank customers for paid orders',
    name: 'Prepaid Order Thank You',
    triggerType: 'order_created',
    paymentMethod: 'prepaid',
    template: MESSAGE_TEMPLATES.prepaid_confirmation,
  },
  {
    key: 'all_orders_welcome',
    icon: '🎉',
    cardColorClass: 'bg-indigo-100',
    title: 'All Orders Welcome',
    description: 'Welcome every order type',
    name: 'Welcome All Orders',
    triggerType: 'order_created',
    paymentMethod: '',
    template: MESSAGE_TEMPLATES.all_orders_welcome,
  },
  {
    key: 'cod_reminder',
    icon: '⏰',
    cardColorClass: 'bg-amber-100',
    title: 'COD Reminder',
    description: 'Remind after 24h no reply',
    name: 'COD Reminder (24h)',
    triggerType: 'no_reply',
    paymentMethod: 'cod',
    template: MESSAGE_TEMPLATES.cod_reminder,
  },
  {
    key: 'cart_recovery',
    icon: '🛒',
    cardColorClass: 'bg-orange-100',
    title: 'Cart Recovery',
    description: 'Recover abandoned carts on WhatsApp',
    name: 'Cart Recovery (24h)',
    triggerType: 'cart_abandoned',
    paymentMethod: '',
    template: MESSAGE_TEMPLATES.cart_recovery,
  },
  {
    key: 'shipment_notification',
    icon: '🚚',
    cardColorClass: 'bg-cyan-100',
    title: 'Shipment Alert',
    description: 'Notify when order ships',
    name: 'Shipment Notification',
    triggerType: 'order_created',
    paymentMethod: '',
    template: MESSAGE_TEMPLATES.shipment_notification,
  },
];

function AutomationQuickTemplatePicker({
  onSelect,
  onSelectCustom,
  variant = 'grid',
}: {
  onSelect: (preset: QuickAutomationPreset) => void;
  onSelectCustom?: () => void;
  variant?: 'grid' | 'list';
}) {
  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {QUICK_AUTOMATION_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onSelect(preset)}
            className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-900">{preset.icon} {preset.title}</p>
            <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {QUICK_AUTOMATION_PRESETS.map((preset) => (
        <button
          key={preset.key}
          type="button"
          onClick={() => onSelect(preset)}
          className="text-left p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
        >
          <div className={`w-10 h-10 ${preset.cardColorClass} rounded-lg flex items-center justify-center mb-3`}>
            <span className="text-xl">{preset.icon}</span>
          </div>
          <h4 className="font-semibold text-slate-900">{preset.title}</h4>
          <p className="text-xs text-slate-600 mt-1">{preset.description}</p>
        </button>
      ))}

      {onSelectCustom && (
        <button
          type="button"
          onClick={onSelectCustom}
          className="text-left p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <span className="text-xl">⚡</span>
          </div>
          <h4 className="font-semibold text-slate-900">Custom Automation</h4>
          <p className="text-xs text-slate-600 mt-1">Build your own rule</p>
        </button>
      )}
    </div>
  );
}

// Create Automation Modal Component
function CreateAutomationModal({ 
  initialData, 
  workspaceCurrency,
  onClose, 
  onSuccess 
}: { 
  initialData?: any;
  workspaceCurrency: string;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic, 2: Trigger, 3: Actions
  const [showTemplates, setShowTemplates] = useState(false);
  
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    triggerType: 'order_created',
    conditions: {
      paymentMethod: '',
    },
    actions: [
      {
        type: 'send_message',
        template: '',
        useButtons: false,
      },
    ],
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter automation name');
      return;
    }

    if ((formData.triggerType === 'order_created' || formData.triggerType === 'cart_abandoned') && !formData.actions[0].template) {
      toast.error('Please enter message template');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        trigger: {
          type: formData.triggerType,
          conditions: formData.conditions.paymentMethod 
            ? { paymentMethod: formData.conditions.paymentMethod }
            : undefined,
        },
        actions: formData.actions,
        isActive: true,
      };

      await automationsApi.createAutomation(payload);
      toast.success('Automation created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create automation', error);
      toast.error(error.response?.data?.message || 'Failed to create automation');
    } finally {
      setSaving(false);
    }
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setFormData({ ...formData, actions: newActions });
  };

  const applyPreset = (preset: QuickAutomationPreset) => {
    setFormData({
      name: preset.name,
      description: preset.description,
      triggerType: preset.triggerType,
      conditions: {
        paymentMethod: preset.paymentMethod,
      },
      actions: [
        {
          type: 'send_message',
          template: preset.template,
          useButtons: false,
        },
      ],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Automation</h2>
              <p className="mt-1 text-sm text-slate-500">Step {step} of 3</p>
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

        <div className="p-6 space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Quick Setup Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Setting up a new automation</p>
                    <p className="mt-1">
                      You'll configure: (1) Basic info, (2) When to trigger, and (3) What actions to take
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Automation Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., COD Order Confirmation"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Give your automation a clear, descriptive name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this automation does..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800 mb-1">Quick template selection</p>
                <p className="text-xs text-slate-500 mb-3">
                  Pick a starter and adjust it later in Step 3.
                </p>
                <AutomationQuickTemplatePicker
                  onSelect={applyPreset}
                  variant="list"
                />
              </div>
            </div>
          )}

          {/* Step 2: Trigger Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  When should this automation trigger?
                </label>
                <select
                  value={formData.triggerType}
                  onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="order_created">New Order Created</option>
                  <option value="cart_abandoned">Cart Abandoned</option>
                  <option value="message_received">Message Received</option>
                  <option value="no_reply">No Reply After X Hours</option>
                </select>
              </div>

              {formData.triggerType === 'order_created' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method Filter (Optional)
                  </label>
                  <select
                    value={formData.conditions.paymentMethod}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      conditions: { ...formData.conditions, paymentMethod: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Orders</option>
                    <option value="cod">COD Only</option>
                    <option value="prepaid">Prepaid Only</option>
                  </select>
                  <p className="mt-1 text-sm text-slate-500">
                    Leave as "All Orders" to trigger for every new order, or select a specific payment method
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Example Use Case:</p>
                    <p className="mt-1">
                      Trigger: "New Order Created" with "COD Only" filter<br />
                      This will automatically send a confirmation message only for Cash on Delivery orders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Actions Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Action Type
                </label>
                <select
                  value={formData.actions[0].type}
                  onChange={(e) => updateAction(0, 'type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="send_message">Send WhatsApp Message</option>
                  <option value="add_tag">Add Tag to Contact</option>
                  <option value="update_order_status">Update Order Status</option>
                </select>
              </div>

              {formData.actions[0].type === 'send_message' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Message Template *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {showTemplates ? 'Hide Templates' : 'Use Pre-built Template'}
                      </button>
                    </div>

                    {/* Template Selection */}
                    {showTemplates && (
                      <div className="mb-4 space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Choose a template:</p>
                        <AutomationQuickTemplatePicker
                          onSelect={(preset) => {
                            updateAction(0, 'template', preset.template);
                            setShowTemplates(false);
                          }}
                          variant="list"
                        />
                      </div>
                    )}

                    <textarea
                      value={formData.actions[0].template}
                      onChange={(e) => updateAction(0, 'template', e.target.value)}
                      placeholder="Enter your message template..."
                      rows={8}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Available variables:
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {'{{customer_name}}'}
                      </code>
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {'{{order_number}}'}
                      </code>
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {'{{order_total}}'}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useButtons"
                      checked={formData.actions[0].useButtons}
                      onChange={(e) => updateAction(0, 'useButtons', e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="useButtons" className="ml-2 text-sm text-slate-700">
                      Add Confirm/Cancel buttons
                    </label>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                    <div className="bg-white rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {formData.actions[0].template
                        .replace('{{customer_name}}', 'Ahmad Khan')
                        .replace('{{order_number}}', '#1001')
                        .replace('{{order_total}}', `${workspaceCurrency} 2,500`)
                        || 'Your message will appear here...'}
                    </div>
                    {formData.actions[0].useButtons && (
                      <div className="mt-2 flex gap-2">
                        <div className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">
                          ✓ Confirm Order
                        </div>
                        <div className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
                          ✗ Cancel Order
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Automation'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// View Automation Details Modal
function ViewAutomationModal({ automation, onClose }: { automation: Automation; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{automation.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{automation.description}</p>
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

        <div className="p-6 space-y-6">
          {/* Trigger Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Trigger</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm"><strong>Type:</strong> {automation.trigger.type}</p>
              {automation.trigger.conditions && (
                <p className="text-sm mt-2">
                  <strong>Conditions:</strong> {JSON.stringify(automation.trigger.conditions, null, 2)}
                </p>
              )}
            </div>
          </div>

          {/* Actions Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Actions</h3>
            <div className="space-y-3">
              {automation.actions.map((action, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    Action {idx + 1}: {action.type}
                  </p>
                  {action.template && (
                    <div className="mt-2 bg-white rounded p-3 text-sm whitespace-pre-wrap font-mono">
                      {action.template}
                    </div>
                  )}
                  {action.useButtons && (
                    <p className="text-sm mt-2 text-slate-600">
                      ✓ Includes interactive buttons
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Execution Stats */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Execution Statistics</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <strong>Total Executions:</strong> {automation.executionCount}
              </p>
              {automation.lastExecutedAt && (
                <p className="text-sm">
                  <strong>Last Executed:</strong> {new Date(automation.lastExecutedAt).toLocaleString()}
                </p>
              )}
              <p className="text-sm">
                <strong>Created:</strong> {new Date(automation.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
