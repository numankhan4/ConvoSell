'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  bodyText: string;
  footerText?: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  createdAt: string;
}

interface QuotaStatus {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  canSend: boolean;
  subscriptionStatus: string;
}

export default function TemplatesPage() {
  const { role } = usePermissions();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templatesRes, quotaRes] = await Promise.all([
        api.get('/api/templates'),
        api.get('/api/templates/quota/status'),
      ]);
      setTemplates(templatesRes.data);
      setQuota(quotaRes.data);
    } catch (error: any) {
      toast.error('Failed to load templates');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getPlanBadge = (plan: string) => {
    const styles = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      business: 'bg-indigo-100 text-indigo-800',
      enterprise: 'bg-pink-100 text-pink-800',
    };
    return styles[plan as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Quota Status */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
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
            <p className="text-sm text-gray-500">
              Create and manage WhatsApp message templates for automated outreach
            </p>
          </div>
          <PermissionGate permission={Permissions.TEMPLATES_CREATE}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </PermissionGate>
        </div>

        {/* Quota Card */}
        {quota && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Quota</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPlanBadge(quota.plan)}`}>
                    {quota.plan.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Used</p>
                    <p className="text-2xl font-bold text-gray-900">{quota.used}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {quota.limit === -1 ? '∞' : quota.remaining}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Limit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {quota.limit === -1 ? 'Unlimited' : quota.limit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Resets</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(quota.resetAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                {quota.limit !== -1 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (quota.used / quota.limit) * 100 > 90
                            ? 'bg-red-600'
                            : (quota.used / quota.limit) * 100 > 70
                            ? 'bg-yellow-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min((quota.used / quota.limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {quota.plan === 'free' && (
                <div className="ml-6">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Upgrade Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new template.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {template.bodyText.substring(0, 80)}
                          {template.bodyText.length > 80 && '...'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      {template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(template.status)}`}>
                      {template.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      <div>Sent: {template.sentCount}</div>
                      <div>
                        Delivered: {template.deliveredCount} (
                        {template.sentCount > 0
                          ? Math.round((template.deliveredCount / template.sentCount) * 100)
                          : 0}
                        %)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <PermissionGate permission={Permissions.TEMPLATES_DELETE}>
                      <button className="text-gray-600 hover:text-gray-900">Delete</button>
                    </PermissionGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Template Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Create Template</h2>
            <p className="text-gray-600 mb-4">
              Template creation form coming soon. For now, create templates directly in Meta Business Manager.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
