'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { workspaceApi } from '@/lib/api/workspace';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadWorkspaceInfo();
  }, [currentWorkspace]);

  const loadWorkspaceInfo = async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      const data = await workspaceApi.getWorkspace();
      setWorkspaceName(data.name);
      setWorkspaceSlug(data.slug);
      setCreatedAt(new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
      // TODO: Get actual member count from API
      setMemberCount(1);
    } catch (error: any) {
      console.error('Failed to load workspace info:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load workspace information';
      toast.error(errorMessage);
      // Fallback to auth store data
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
        setWorkspaceSlug(currentWorkspace.slug);
        setCreatedAt('N/A');
        setMemberCount(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const updatedWorkspace = await workspaceApi.updateWorkspace({ name: workspaceName });
      
      // Update the auth store with the new workspace data
      setCurrentWorkspace(updatedWorkspace);
      
      // Also update the workspace in the workspaces array
      const updatedWorkspaces = workspaces.map(w => 
        w.id === updatedWorkspace.id ? updatedWorkspace : w
      );
      
      // Force a re-render by updating the store
      useAuthStore.setState({ 
        currentWorkspace: updatedWorkspace,
        workspaces: updatedWorkspaces 
      });
      
      toast.success('Workspace name updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update workspace name:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update workspace name';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !workspaceName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading workspace settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          ← Back to Settings
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Workspace Settings</h1>
        <p className="text-gray-600 mt-2">Manage your workspace information and preferences</p>
      </div>

      {/* Workspace Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Workspace Information</h2>
        
        {/* Workspace Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace Name
          </label>
          {isEditing ? (
            <form onSubmit={handleUpdateName} className="flex gap-2">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter workspace name"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  loadWorkspaceInfo();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-900 text-lg">{workspaceName}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Workspace Slug */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace Slug
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workspaceSlug}
              disabled
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
            <span className="text-xs text-gray-500">Read-only</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            The workspace slug is used in URLs and cannot be changed
          </p>
        </div>

        {/* Workspace ID */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace ID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentWorkspace?.id || 'N/A'}
              disabled
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed font-mono text-sm"
            />
            <button
              onClick={() => {
                if (currentWorkspace?.id) {
                  navigator.clipboard.writeText(currentWorkspace.id);
                  toast.success('Workspace ID copied to clipboard');
                }
              }}
              className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created
            </label>
            <p className="text-gray-900">{createdAt}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Members
            </label>
            <p className="text-gray-900">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Data Management Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Data Management</h2>
        <p className="text-gray-600 mb-4">
          Manage your workspace data, integrations, and cleanup operations
        </p>
        <button
          onClick={() => router.push('/dashboard/settings/data')}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Data & Integrations →
        </button>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-white rounded-lg shadow-md border-2 border-red-200 p-6">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-gray-600 mb-4">
          Permanently delete this workspace and all associated data
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this workspace? This action cannot be undone!')) {
              toast.error('Workspace deletion is not yet implemented');
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Workspace
        </button>
        <p className="text-xs text-gray-500 mt-2">
          This will permanently delete all messages, contacts, orders, and integrations
        </p>
      </div>
    </div>
  );
}
