import { useAuthStore } from '@/lib/store/auth';
import { useMemo } from 'react';

export type Permission = string;

export interface UsePermissionsReturn {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  permissions: Permission[];
  role: string;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
  isViewer: boolean;
}

/**
 * Hook to check user permissions in the current workspace
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, currentWorkspaceMember } = useAuthStore();

  const permissions = useMemo(() => {
    // Super admins have all permissions
    if (user?.isSuperAdmin) {
      return ['*'];
    }
    
    // Return workspace member permissions
    // This will be populated by the backend when we fetch workspace member data
    return (currentWorkspaceMember?.permissions as Permission[]) || [];
  }, [user, currentWorkspaceMember]);

  const role = currentWorkspaceMember?.role || 'viewer';

  const hasPermission = (permission: Permission): boolean => {
    if (user?.isSuperAdmin) return true;
    return permissions.includes(permission) || permissions.includes('*');
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    if (user?.isSuperAdmin) return true;
    return perms.some(p => hasPermission(p));
  };

  const hasAllPermissions = (perms: Permission[]): boolean => {
    if (user?.isSuperAdmin) return true;
    return perms.every(p => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    role,
    isSuperAdmin: user?.isSuperAdmin || false,
    isOwner: role === 'owner',
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isAgent: role === 'agent',
    isViewer: role === 'viewer',
  };
}

// Permission constants (matching backend)
export const Permissions = {
  // Workspace
  WORKSPACE_VIEW: 'workspace:view',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_BILLING: 'workspace:billing',
  
  // Team
  TEAM_VIEW: 'team:view',
  TEAM_INVITE: 'team:invite',
  TEAM_REMOVE: 'team:remove',
  TEAM_CHANGE_ROLES: 'team:change_roles',
  
  // Integrations
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_CONNECT: 'integrations:connect',
  INTEGRATIONS_DISCONNECT: 'integrations:disconnect',
  
  // Contacts
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_EXPORT: 'contacts:export',
  
  // Conversations
  CONVERSATIONS_VIEW_ALL: 'conversations:view_all',
  CONVERSATIONS_SEND: 'conversations:send',
  CONVERSATIONS_ASSIGN: 'conversations:assign',
  
  // Orders
  ORDERS_VIEW: 'orders:view',
  ORDERS_CONFIRM: 'orders:confirm',
  ORDERS_CANCEL: 'orders:cancel',
  ORDERS_EXPORT: 'orders:export',
  
  // Automations
  AUTOMATIONS_VIEW: 'automations:view',
  AUTOMATIONS_CREATE: 'automations:create',
  AUTOMATIONS_UPDATE: 'automations:update',
  AUTOMATIONS_DELETE: 'automations:delete',
  
  // Templates
  TEMPLATES_VIEW: 'templates:view',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  TEMPLATES_SEND: 'templates:send',
  
  // Analytics
  ANALYTICS_VIEW_DASHBOARD: 'analytics:view_dashboard',
  ANALYTICS_EXPORT: 'analytics:export',
  ANALYTICS_VIEW_REVENUE: 'analytics:view_revenue',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
} as const;
