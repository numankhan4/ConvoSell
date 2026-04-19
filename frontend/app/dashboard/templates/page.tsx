'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
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

type TemplateDetail = Template & {
  rejectionReason?: string | null;
  variables?: Array<{ name: string; example: string }> | null;
  buttons?: Array<{ type: string; text: string; url?: string; phoneNumber?: string }> | null;
  templateMessages?: Array<{
    id: string;
    recipientPhone: string;
    status: string;
    sentAt?: string | null;
    deliveredAt?: string | null;
    readAt?: string | null;
    estimatedCost?: number | null;
  }>;
};

type CreateTemplatePayload = {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language?: string;
  bodyText: string;
  footerText?: string;
  variables?: Array<{ name: string; example: string }>;
};

export default function TemplatesPage() {
  const { role } = usePermissions();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [viewingTemplateId, setViewingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [templatesRes, quotaRes] = await Promise.all([
        api.get('/api/templates'),
        api.get('/api/templates/quota/status'),
      ]);
      setTemplates(templatesRes.data);
      setQuota(quotaRes.data);
    } catch (error: any) {
      setLoadError('We could not load your template library. Please retry.');
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

  const handleViewTemplate = async (templateId: string) => {
    setIsViewLoading(true);
    setViewingTemplateId(templateId);
    try {
      const response = await api.get(`/api/templates/${templateId}`);
      setSelectedTemplate(response.data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load template details';
      toast.error(typeof message === 'string' ? message : 'Failed to load template details');
    } finally {
      setIsViewLoading(false);
      setViewingTemplateId(null);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    const confirmDelete = window.confirm(
      `Delete template "${template.name}"? This cannot be undone.`,
    );

    if (!confirmDelete) {
      return;
    }

    setDeletingTemplateId(template.id);
    try {
      await api.delete(`/api/templates/${template.id}`);
      toast.success('Template deleted successfully');
      await loadData();
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete template';
      toast.error(typeof message === 'string' ? message : 'Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-96 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
          <div className="h-20 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-16 rounded bg-slate-100 animate-pulse" />
          <div className="h-16 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with Quota Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Message Templates</h1>
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
            <p className="text-sm sm:text-base text-slate-600">
              Manage your approved WhatsApp templates for automations and post-window outreach.
            </p>
          </div>
          <PermissionGate permission={Permissions.TEMPLATES_CREATE}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </PermissionGate>
        </div>

        {loadError && (
          <div className="mb-4 rounded-xl border border-danger-200 bg-danger-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-danger-800">{loadError}</p>
              <button
                onClick={loadData}
                className="rounded-lg border border-danger-300 bg-white px-3 py-1.5 text-xs font-semibold text-danger-800 hover:bg-danger-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Quota Card */}
        {quota && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">Monthly Template Quota</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPlanBadge(quota.plan)}`}>
                    {quota.plan.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
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
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
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
          <h3 className="mt-2 text-base font-semibold text-slate-900">No templates yet</h3>
          <p className="mt-1 text-sm text-slate-600">Create your first template to support automations and follow-ups.</p>
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
                    <button
                      onClick={() => handleViewTemplate(template.id)}
                      disabled={isViewLoading}
                      className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isViewLoading && viewingTemplateId === template.id ? 'Loading...' : 'View'}
                    </button>
                    <PermissionGate permission={Permissions.TEMPLATES_DELETE}>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={deletingTemplateId === template.id}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingTemplateId === template.id ? 'Deleting...' : 'Delete'}
                      </button>
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
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await loadData();
          }}
        />
      )}

      {selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          getStatusBadge={getStatusBadge}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}

function TemplateDetailsModal({
  template,
  getStatusBadge,
  onClose,
}: {
  template: TemplateDetail;
  getStatusBadge: (status: string) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Template Details</h2>
            <p className="mt-1 text-sm text-slate-600">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Category</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{template.category}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Language</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{template.language}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Status</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(template.status)}`}>
                {template.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">Body</p>
            <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 whitespace-pre-wrap">
              {template.bodyText}
            </div>
          </div>

          {template.footerText && (
            <div>
              <p className="text-sm font-medium text-slate-700">Footer</p>
              <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
                {template.footerText}
              </div>
            </div>
          )}

          {template.status === 'REJECTED' && template.rejectionReason && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">
              <p className="font-semibold">Rejection Reason</p>
              <p className="mt-1">{template.rejectionReason}</p>
            </div>
          )}

          {Array.isArray(template.variables) && template.variables.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700">Variables</p>
              <div className="mt-2 space-y-2">
                {template.variables.map((variable, idx) => (
                  <div key={`${variable.name}-${idx}`} className="rounded-lg border border-slate-200 p-2 text-sm">
                    <span className="font-medium text-slate-900">{variable.name}</span>
                    <span className="ml-2 text-slate-600">Example: {variable.example}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(template.templateMessages) && template.templateMessages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700">Recent Sends</p>
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Recipient</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {template.templateMessages.map((msg) => (
                      <tr key={msg.id}>
                        <td className="px-3 py-2 text-slate-900">{msg.recipientPhone}</td>
                        <td className="px-3 py-2 text-slate-700">{msg.status}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY' as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
    language: 'en',
    bodyText: '',
    footerText: '',
  });
  const [variableExamples, setVariableExamples] = useState<Record<string, string>>({});

  const bodyPlaceholders = useMemo(() => {
    const matches = formData.bodyText.match(/{{\s*\d+\s*}}/g) || [];
    const nums = matches
      .map((token) => Number(token.replace(/[^\d]/g, '')))
      .filter((n) => Number.isFinite(n));
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  }, [formData.bodyText]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.bodyText.trim()) {
      toast.error('Template body is required');
      return;
    }

    if (bodyPlaceholders.length > 0) {
      for (const placeholder of bodyPlaceholders) {
        if (!variableExamples[String(placeholder)]?.trim()) {
          toast.error(`Please provide an example for variable {{${placeholder}}}`);
          return;
        }
      }
    }

    const payload: CreateTemplatePayload = {
      name: formData.name.trim(),
      category: formData.category,
      language: formData.language.trim() || 'en',
      bodyText: formData.bodyText.trim(),
      footerText: formData.footerText.trim() || undefined,
    };

    if (bodyPlaceholders.length > 0) {
      payload.variables = bodyPlaceholders.map((placeholder) => ({
        name: `var_${placeholder}`,
        example: variableExamples[String(placeholder)].trim(),
      }));
    }

    setSaving(true);
    try {
      await api.post('/api/templates', payload);
      toast.success('Template submitted to Meta for approval');
      await onCreated();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create template';
      toast.error(typeof message === 'string' ? message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <form onSubmit={handleCreate}>
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-slate-900">Create Message Template</h2>
            <p className="mt-1 text-sm text-slate-600">
              New templates are submitted to Meta and remain pending until approved.
            </p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Template Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="order_confirmation_v1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-1 text-xs text-slate-500">Use lowercase letters, numbers, and underscores.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as CreateTemplatePayload['category'] }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Language Code</label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                placeholder="en"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-1 text-xs text-slate-500">Example: en, en_US, ur.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Body Text</label>
              <textarea
                value={formData.bodyText}
                onChange={(e) => setFormData((prev) => ({ ...prev, bodyText: e.target.value }))}
                rows={5}
                placeholder="Hi {{1}}, your order {{2}} is confirmed."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-1 text-xs text-slate-500">Use numbered placeholders like {'{{1}}'}, {'{{2}}'} for dynamic values.</p>
            </div>

            {bodyPlaceholders.length > 0 && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                <h3 className="text-sm font-semibold text-primary-900">Variable Examples</h3>
                <p className="mt-1 text-xs text-primary-800">Meta usually requires examples for each placeholder.</p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {bodyPlaceholders.map((placeholder) => (
                    <div key={placeholder}>
                      <label className="mb-1 block text-xs font-medium text-slate-700">{`{{${placeholder}}} example`}</label>
                      <input
                        type="text"
                        value={variableExamples[String(placeholder)] || ''}
                        onChange={(e) =>
                          setVariableExamples((prev) => ({
                            ...prev,
                            [String(placeholder)]: e.target.value,
                          }))
                        }
                        placeholder={`Example value for {{${placeholder}}}`}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Footer Text (optional)</label>
              <input
                type="text"
                value={formData.footerText}
                onChange={(e) => setFormData((prev) => ({ ...prev, footerText: e.target.value }))}
                placeholder="Reply STOP to opt out"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
