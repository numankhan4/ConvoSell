'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function TestDataManagerPage() {
  const { currentWorkspace, token } = useAuthStore();
  const { isOwner } = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [datStats, setDataStats] = useState({
    contacts: 0,
    conversations: 0,
    messages: 0,
    orders: 0,
    automations: 0,
    templates: 0,
  });

  // Redirect non-owners
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Access Denied</h3>
              <p className="text-sm text-red-700 mt-1">
                Only workspace owners can access test data management.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerateTestData = async () => {
    if (!currentWorkspace) return;

    const confirmed = window.confirm(
      'Generate test data?\n\n' +
      'This will create:\n' +
      '• 10 test contacts\n' +
      '• 5 conversations with messages\n' +
      '• 8 sample orders\n' +
      '• 3 automation rules\n' +
      '• 3 message templates\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      toast.loading('Generating test data...', { id: 'generate-data' });

      const response = await axios.post(
        `${API_URL}/test-data/generate`,
        { workspaceId: currentWorkspace.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': currentWorkspace.id,
          },
        }
      );

      setDataStats(response.data.stats || datStats);
      toast.success('Test data generated successfully!', { id: 'generate-data' });
    } catch (error: any) {
      console.error('Failed to generate test data:', error);
      const errorMsg = error.response?.data?.message || 'Failed to generate test data';
      toast.error(errorMsg, { id: 'generate-data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTestData = async () => {
    if (!currentWorkspace) return;

    const confirmed = window.confirm(
      '⚠️ DELETE ALL TEST DATA?\n\n' +
      'This will permanently delete:\n' +
      '• All contacts\n' +
      '• All conversations and messages\n' +
      '• All orders\n' +
      '• All automation rules\n' +
      '• All message templates\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Type "DELETE" to confirm'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type DELETE to confirm:');
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled');
      return;
    }

    try {
      setIsLoading(true);
      toast.loading('Deleting all test data...', { id: 'delete-data' });

      await axios.delete(
        `${API_URL}/test-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': currentWorkspace.id,
          },
        }
      );

      setDataStats({
        contacts: 0,
        conversations: 0,
        messages: 0,
        orders: 0,
        automations: 0,
        templates: 0,
      });

      toast.success('All test data deleted successfully!', { id: 'delete-data' });
    } catch (error: any) {
      console.error('Failed to delete test data:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete test data';
      toast.error(errorMsg, { id: 'delete-data' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-7 h-7 text-purple-600" />
          Test Data Manager
        </h1>
        <p className="text-gray-600 mt-1">
          Generate and manage test data for your workspace
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Testing Environment</p>
            <p className="text-sm text-blue-700 mt-1">
              Each test user (owner, admin, manager, agent, viewer) now has their own isolated workspace.
              Use this tool to populate your workspace with sample data for testing RBAC features.
            </p>
          </div>
        </div>
      </div>

      {/* Current Workspace Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Workspace</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Workspace Name</p>
            <p className="text-lg font-medium text-gray-900">{currentWorkspace?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Workspace ID</p>
            <p className="text-sm font-mono text-gray-700">{currentWorkspace?.id}</p>
          </div>
        </div>
      </div>

      {/* Data Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Data</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{datStats.contacts}</p>
            <p className="text-xs text-gray-600 mt-1">Contacts</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{datStats.conversations}</p>
            <p className="text-xs text-gray-600 mt-1">Conversations</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{datStats.messages}</p>
            <p className="text-xs text-gray-600 mt-1">Messages</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{datStats.orders}</p>
            <p className="text-xs text-gray-600 mt-1">Orders</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{datStats.automations}</p>
            <p className="text-xs text-gray-600 mt-1">Automations</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">{datStats.templates}</p>
            <p className="text-xs text-gray-600 mt-1">Templates</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate Test Data */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-green-500 rounded-lg p-3">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Generate Test Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                Populate your workspace with sample contacts, orders, conversations, and more.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>10 Sample Contacts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>5 Conversations with Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>8 Sample Orders (mixed statuses)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>3 Automation Rules</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>3 WhatsApp Message Templates</span>
            </div>
          </div>

          <button
            onClick={handleGenerateTestData}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Generate Test Data
              </>
            )}
          </button>
        </div>

        {/* Delete All Test Data */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-red-500 rounded-lg p-3">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Delete All Test Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                Permanently remove all data from this workspace. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Danger Zone</p>
                <p className="text-xs text-red-700 mt-1">
                  This will delete ALL contacts, messages, orders, automations, and templates from your workspace.
                  You will need to regenerate test data after deletion.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeleteTestData}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Delete All Test Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Reset Button */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-purple-900">Quick Reset</p>
            <p className="text-sm text-purple-700 mt-0.5">
              Delete all data and regenerate fresh test data in one click
            </p>
          </div>
          <button
            onClick={async () => {
              await handleDeleteTestData();
              if (!isLoading) {
                setTimeout(() => handleGenerateTestData(), 1000);
              }
            }}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset & Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
