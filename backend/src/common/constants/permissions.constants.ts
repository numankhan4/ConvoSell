/**
 * Role-Based Access Control (RBAC) Constants
 * Workspace-level roles and permissions
 */

export enum WorkspaceRole {
  OWNER = 'owner',       // Full control including billing
  ADMIN = 'admin',       // Full control except billing
  MANAGER = 'manager',   // Team & operations management
  AGENT = 'agent',       // Customer-facing operations
  VIEWER = 'viewer',     // Read-only access
}

export enum Permission {
  // Workspace Management
  WORKSPACE_VIEW = 'workspace:view',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_DELETE = 'workspace:delete',
  WORKSPACE_BILLING = 'workspace:billing',
  
  // Team Management
  TEAM_VIEW = 'team:view',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  TEAM_CHANGE_ROLES = 'team:change_roles',
  
  // Integrations
  INTEGRATIONS_VIEW = 'integrations:view',
  INTEGRATIONS_CONNECT = 'integrations:connect',
  INTEGRATIONS_DISCONNECT = 'integrations:disconnect',
  INTEGRATIONS_CONFIGURE = 'integrations:configure',
  
  // Contacts
  CONTACTS_VIEW = 'contacts:view',
  CONTACTS_CREATE = 'contacts:create',
  CONTACTS_UPDATE = 'contacts:update',
  CONTACTS_DELETE = 'contacts:delete',
  CONTACTS_EXPORT = 'contacts:export',
  CONTACTS_IMPORT = 'contacts:import',
  
  // Conversations & Messages
  CONVERSATIONS_VIEW_ALL = 'conversations:view_all',
  CONVERSATIONS_VIEW_ASSIGNED = 'conversations:view_assigned',
  CONVERSATIONS_SEND = 'conversations:send',
  CONVERSATIONS_ASSIGN = 'conversations:assign',
  CONVERSATIONS_CLOSE = 'conversations:close',
  
  // Orders
  ORDERS_VIEW = 'orders:view',
  ORDERS_CONFIRM = 'orders:confirm',
  ORDERS_CANCEL = 'orders:cancel',
  ORDERS_EXPORT = 'orders:export',
  ORDERS_SYNC = 'orders:sync',
  
  // Automations
  AUTOMATIONS_VIEW = 'automations:view',
  AUTOMATIONS_CREATE = 'automations:create',
  AUTOMATIONS_UPDATE = 'automations:update',
  AUTOMATIONS_DELETE = 'automations:delete',
  AUTOMATIONS_TOGGLE = 'automations:toggle',
  
  // Templates
  TEMPLATES_VIEW = 'templates:view',
  TEMPLATES_CREATE = 'templates:create',
  TEMPLATES_UPDATE = 'templates:update',
  TEMPLATES_DELETE = 'templates:delete',
  TEMPLATES_SEND = 'templates:send',
  TEMPLATES_MANAGE_QUOTA = 'templates:manage_quota',
  
  // Analytics & Reports
  ANALYTICS_VIEW_DASHBOARD = 'analytics:view_dashboard',
  ANALYTICS_VIEW_REPORTS = 'analytics:view_reports',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_VIEW_REVENUE = 'analytics:view_revenue',
  
  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_WEBHOOKS = 'settings:webhooks',
  
  // Testing & Development
  USERS_IMPERSONATE = 'users:impersonate', // Switch to another user for testing
  USERS_VIEW_ALL = 'users:view_all', // View all workspace users
}

/**
 * Role to Permissions mapping
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  /**
   * OWNER - Full control including billing
   */
  [WorkspaceRole.OWNER]: [
    // Workspace
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKSPACE_BILLING,
    
    // Team
    Permission.TEAM_VIEW,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    Permission.TEAM_CHANGE_ROLES,
    
    // Integrations
    Permission.INTEGRATIONS_VIEW,
    Permission.INTEGRATIONS_CONNECT,
    Permission.INTEGRATIONS_DISCONNECT,
    Permission.INTEGRATIONS_CONFIGURE,
    
    // Contacts
    Permission.CONTACTS_VIEW,
    Permission.CONTACTS_CREATE,
    Permission.CONTACTS_UPDATE,
    Permission.CONTACTS_DELETE,
    Permission.CONTACTS_EXPORT,
    Permission.CONTACTS_IMPORT,
    
    // Conversations
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    Permission.CONVERSATIONS_SEND,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    
    // Orders
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CONFIRM,
    Permission.ORDERS_CANCEL,
    Permission.ORDERS_EXPORT,
    Permission.ORDERS_SYNC,
    
    // Automations
    Permission.AUTOMATIONS_VIEW,
    Permission.AUTOMATIONS_CREATE,
    Permission.AUTOMATIONS_UPDATE,
    Permission.AUTOMATIONS_DELETE,
    Permission.AUTOMATIONS_TOGGLE,
    
    // Templates
    Permission.TEMPLATES_VIEW,
    Permission.TEMPLATES_CREATE,
    Permission.TEMPLATES_UPDATE,
    Permission.TEMPLATES_DELETE,
    Permission.TEMPLATES_SEND,
    Permission.TEMPLATES_MANAGE_QUOTA,
    
    // Analytics
    Permission.ANALYTICS_VIEW_DASHBOARD,
    Permission.ANALYTICS_VIEW_REPORTS,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_VIEW_REVENUE,
    
    // Settings
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
    Permission.SETTINGS_WEBHOOKS,
    
    // Testing & Development
    Permission.USERS_IMPERSONATE,
    Permission.USERS_VIEW_ALL,
  ],

  /**
   * ADMIN - Full control except billing
   */
  [WorkspaceRole.ADMIN]: [
    // Workspace (no billing)
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_UPDATE,
    
    // Team
    Permission.TEAM_VIEW,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    Permission.TEAM_CHANGE_ROLES,
    
    // Integrations
    Permission.INTEGRATIONS_VIEW,
    Permission.INTEGRATIONS_CONNECT,
    Permission.INTEGRATIONS_DISCONNECT,
    Permission.INTEGRATIONS_CONFIGURE,
    
    // Contacts
    Permission.CONTACTS_VIEW,
    Permission.CONTACTS_CREATE,
    Permission.CONTACTS_UPDATE,
    Permission.CONTACTS_DELETE,
    Permission.CONTACTS_EXPORT,
    Permission.CONTACTS_IMPORT,
    
    // Conversations
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    Permission.CONVERSATIONS_SEND,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    
    // Orders
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CONFIRM,
    Permission.ORDERS_CANCEL,
    Permission.ORDERS_EXPORT,
    Permission.ORDERS_SYNC,
    
    // Automations
    Permission.AUTOMATIONS_VIEW,
    Permission.AUTOMATIONS_CREATE,
    Permission.AUTOMATIONS_UPDATE,
    Permission.AUTOMATIONS_DELETE,
    Permission.AUTOMATIONS_TOGGLE,
    
    // Templates
    Permission.TEMPLATES_VIEW,
    Permission.TEMPLATES_CREATE,
    Permission.TEMPLATES_UPDATE,
    Permission.TEMPLATES_DELETE,
    Permission.TEMPLATES_SEND,
    
    // Analytics
    Permission.ANALYTICS_VIEW_DASHBOARD,
    Permission.ANALYTICS_VIEW_REPORTS,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_VIEW_REVENUE,
    
    // Settings
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
    Permission.SETTINGS_WEBHOOKS,
  ],

  /**
   * MANAGER - Team & operations management
   */
  [WorkspaceRole.MANAGER]: [
    // Workspace
    Permission.WORKSPACE_VIEW,
    
    // Team (can invite/remove but not change roles)
    Permission.TEAM_VIEW,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    
    // Integrations
    Permission.INTEGRATIONS_VIEW,
    Permission.INTEGRATIONS_CONNECT,
    Permission.INTEGRATIONS_CONFIGURE,
    
    // Contacts
    Permission.CONTACTS_VIEW,
    Permission.CONTACTS_CREATE,
    Permission.CONTACTS_UPDATE,
    Permission.CONTACTS_DELETE,
    Permission.CONTACTS_EXPORT,
    Permission.CONTACTS_IMPORT,
    
    // Conversations
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    Permission.CONVERSATIONS_SEND,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    
    // Orders
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CONFIRM,
    Permission.ORDERS_CANCEL,
    Permission.ORDERS_EXPORT,
    Permission.ORDERS_SYNC,
    
    // Automations
    Permission.AUTOMATIONS_VIEW,
    Permission.AUTOMATIONS_CREATE,
    Permission.AUTOMATIONS_UPDATE,
    Permission.AUTOMATIONS_DELETE,
    Permission.AUTOMATIONS_TOGGLE,
    
    // Templates
    Permission.TEMPLATES_VIEW,
    Permission.TEMPLATES_CREATE,
    Permission.TEMPLATES_UPDATE,
    Permission.TEMPLATES_SEND,
    
    // Analytics
    Permission.ANALYTICS_VIEW_DASHBOARD,
    Permission.ANALYTICS_VIEW_REPORTS,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_VIEW_REVENUE,
    
    // Settings
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
  ],

  /**
   * AGENT - Customer-facing operations
   */
  [WorkspaceRole.AGENT]: [
    // Workspace
    Permission.WORKSPACE_VIEW,
    
    // Team (view only)
    Permission.TEAM_VIEW,
    
    // Integrations (view only)
    Permission.INTEGRATIONS_VIEW,
    
    // Contacts
    Permission.CONTACTS_VIEW,
    Permission.CONTACTS_CREATE,
    Permission.CONTACTS_UPDATE,
    
    // Conversations
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    Permission.CONVERSATIONS_SEND,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    
    // Orders
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CONFIRM,
    Permission.ORDERS_CANCEL,
    
    // Automations (view only)
    Permission.AUTOMATIONS_VIEW,
    
    // Templates
    Permission.TEMPLATES_VIEW,
    Permission.TEMPLATES_SEND,
    
    // Analytics
    Permission.ANALYTICS_VIEW_DASHBOARD,
    Permission.ANALYTICS_VIEW_REPORTS,
    
    // Settings (view only)
    Permission.SETTINGS_VIEW,
  ],

  /**
   * VIEWER - Read-only access
   */
  [WorkspaceRole.VIEWER]: [
    // Workspace
    Permission.WORKSPACE_VIEW,
    
    // Team
    Permission.TEAM_VIEW,
    
    // Integrations
    Permission.INTEGRATIONS_VIEW,
    
    // Contacts
    Permission.CONTACTS_VIEW,
    
    // Conversations
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    
    // Orders
    Permission.ORDERS_VIEW,
    
    // Automations
    Permission.AUTOMATIONS_VIEW,
    
    // Templates
    Permission.TEMPLATES_VIEW,
    
    // Analytics
    Permission.ANALYTICS_VIEW_DASHBOARD,
    Permission.ANALYTICS_VIEW_REPORTS,
    
    // Settings
    Permission.SETTINGS_VIEW,
  ],
};

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: WorkspaceRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: WorkspaceRole): string {
  const displayNames: Record<WorkspaceRole, string> = {
    [WorkspaceRole.OWNER]: 'Owner',
    [WorkspaceRole.ADMIN]: 'Admin',
    [WorkspaceRole.MANAGER]: 'Manager',
    [WorkspaceRole.AGENT]: 'Agent',
    [WorkspaceRole.VIEWER]: 'Viewer',
  };
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: WorkspaceRole): string {
  const descriptions: Record<WorkspaceRole, string> = {
    [WorkspaceRole.OWNER]: 'Full control including billing and workspace deletion',
    [WorkspaceRole.ADMIN]: 'Full control except billing management',
    [WorkspaceRole.MANAGER]: 'Manage team and daily operations',
    [WorkspaceRole.AGENT]: 'Handle customer interactions and orders',
    [WorkspaceRole.VIEWER]: 'Read-only access to all data',
  };
  return descriptions[role] || '';
}
