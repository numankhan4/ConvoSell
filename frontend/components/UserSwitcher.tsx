'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { 
  User, 
  ChevronDown, 
  UserCheck, 
  LogOut,
  Shield,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export default function UserSwitcher() {
  const { 
    user, 
    workspaceUsers, 
    isImpersonating,
    originalUserId,
    impersonateUser, 
    stopImpersonation, 
    fetchWorkspaceUsers 
  } = useAuthStore();
  
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show if user has impersonate permission OR is currently impersonating
  const canImpersonate = hasPermission('users:impersonate');
  const shouldShowSwitcher = canImpersonate || isImpersonating;

  useEffect(() => {
    if (canImpersonate) {
      fetchWorkspaceUsers();
    }
  }, [canImpersonate, fetchWorkspaceUsers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!shouldShowSwitcher) {
    return null;
  }

  const handleImpersonate = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await impersonateUser(userId);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to switch user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await stopImpersonation();
      setIsOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to stop impersonation');
    } finally {
      setIsLoading(false);
    }
  };

  // Find the original user if impersonating
  const originalUser = isImpersonating 
    ? workspaceUsers.find(u => u.id === originalUserId)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
          isImpersonating
            ? 'bg-orange-500/10 border border-orange-500/30 text-orange-600 hover:bg-orange-500/20'
            : 'bg-purple-500/10 border border-purple-500/30 text-purple-600 hover:bg-purple-500/20'
        }`}
        title={isImpersonating ? "Currently viewing as another user" : "Switch User (Testing)"}
      >
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {isImpersonating ? 'Viewing As...' : 'Switch User'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Testing Mode</p>
                <p className="text-xs opacity-90 truncate">Switch between test users</p>
              </div>
            </div>
          </div>

          {/* Impersonation Warning */}
          {isImpersonating && originalUser && (
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-orange-900">
                    Viewing as: {user?.firstName} {user?.lastName}
                  </p>
                  <button
                    onClick={handleStopImpersonation}
                    disabled={isLoading}
                    className="mt-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Return to {originalUser.firstName} {originalUser.lastName}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* User List */}
          <div className="max-h-80 overflow-y-auto">
            {isImpersonating && !canImpersonate ? (
              // If impersonating without permission, only show return button (already shown above)
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Limited Access</p>
                <p className="text-xs mt-1">Use the button above to return</p>
              </div>
            ) : workspaceUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No test users found</p>
                <p className="text-xs mt-1">Run the test user seed script</p>
              </div>
            ) : (
              <div className="py-2">
                {workspaceUsers.map((testUser) => {
                  const isCurrent = testUser.id === user?.id;
                  const isOriginal = testUser.id === originalUserId;
                  
                  const roleColors: Record<string, string> = {
                    owner: 'bg-red-100 text-red-700 border-red-200',
                    admin: 'bg-blue-100 text-blue-700 border-blue-200',
                    manager: 'bg-green-100 text-green-700 border-green-200',
                    agent: 'bg-purple-100 text-purple-700 border-purple-200',
                    viewer: 'bg-gray-100 text-gray-700 border-gray-200',
                  };

                  return (
                    <button
                      key={testUser.id}
                      onClick={() => !isCurrent && handleImpersonate(testUser.id)}
                      disabled={isCurrent || isLoading}
                      className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-60 ${
                        isCurrent ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCurrent ? 'bg-purple-500 text-white' : 
                          isOriginal ? 'bg-orange-500 text-white' : 
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {isCurrent ? (
                            <UserCheck className="w-4 h-4" />
                          ) : isOriginal ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {testUser.firstName} {testUser.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{testUser.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border flex-shrink-0 ${
                        roleColors[(testUser as any).role] || roleColors.viewer
                      }`}>
                        {((testUser as any).role || 'viewer').toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💡 Switch users to test role-based permissions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
