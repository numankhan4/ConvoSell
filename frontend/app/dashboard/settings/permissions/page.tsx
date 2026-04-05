'use client';

import { useState } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Info,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';

// Role permission matrix - matches backend permissions.constants.ts
const PERMISSIONS_BY_CATEGORY = {
  'Workspace Management': [
    { key: 'workspace:view', label: 'View Workspace', description: 'View workspace details' },
    { key: 'workspace:update', label: 'Update Workspace', description: 'Edit workspace settings' },
    { key: 'workspace:delete', label: 'Delete Workspace', description: 'Permanently delete workspace' },
    { key: 'workspace:billing', label: 'Manage Billing', description: 'Access billing and payments' },
  ],
  'Team Management': [
    { key: 'team:view', label: 'View Team', description: 'View team members' },
    { key: 'team:invite', label: 'Invite Members', description: 'Invite new team members' },
    { key: 'team:remove', label: 'Remove Members', description: 'Remove team members' },
    { key: 'team:change_roles', label: 'Change Roles', description: 'Modify member roles' },
  ],
  'Integrations': [
    { key: 'integrations:view', label: 'View Integrations', description: 'View connected integrations' },
    { key: 'integrations:connect', label: 'Connect Integrations', description: 'Connect new integrations' },
    { key: 'integrations:disconnect', label: 'Disconnect', description: 'Disconnect integrations' },
    { key: 'integrations:configure', label: 'Configure', description: 'Configure integration settings' },
  ],
  'Contacts': [
    { key: 'contacts:view', label: 'View Contacts', description: 'View contact list' },
    { key: 'contacts:create', label: 'Create Contacts', description: 'Add new contacts' },
    { key: 'contacts:update', label: 'Update Contacts', description: 'Edit contact details' },
    { key: 'contacts:delete', label: 'Delete Contacts', description: 'Remove contacts' },
    { key: 'contacts:export', label: 'Export Contacts', description: 'Export contact data' },
    { key: 'contacts:import', label: 'Import Contacts', description: 'Bulk import contacts' },
  ],
  'Conversations': [
    { key: 'conversations:view_all', label: 'View All Conversations', description: 'View all team conversations' },
    { key: 'conversations:view_assigned', label: 'View Assigned', description: 'View assigned conversations' },
    { key: 'conversations:send', label: 'Send Messages', description: 'Send messages to customers' },
    { key: 'conversations:assign', label: 'Assign Conversations', description: 'Assign to team members' },
    { key: 'conversations:close', label: 'Close Conversations', description: 'Mark conversations as closed' },
  ],
  'Orders': [
    { key: 'orders:view', label: 'View Orders', description: 'View order list' },
    { key: 'orders:confirm', label: 'Confirm Orders', description: 'Confirm customer orders' },
    { key: 'orders:cancel', label: 'Cancel Orders', description: 'Cancel orders' },
    { key: 'orders:export', label: 'Export Orders', description: 'Export order data' },
    { key: 'orders:sync', label: 'Sync Orders', description: 'Sync with Shopify' },
  ],
  'Automations': [
    { key: 'automations:view', label: 'View Automations', description: 'View automation rules' },
    { key: 'automations:create', label: 'Create Automations', description: 'Create new automation rules' },
    { key: 'automations:update', label: 'Update Automations', description: 'Edit automation rules' },
    { key: 'automations:delete', label: 'Delete Automations', description: 'Remove automation rules' },
    { key: 'automations:toggle', label: 'Toggle Automations', description: 'Enable/disable automations' },
  ],
  'Templates': [
    { key: 'templates:view', label: 'View Templates', description: 'View message templates' },
    { key: 'templates:create', label: 'Create Templates', description: 'Create new templates' },
    { key: 'templates:update', label: 'Update Templates', description: 'Edit templates' },
    { key: 'templates:delete', label: 'Delete Templates', description: 'Remove templates' },
    { key: 'templates:send', label: 'Send Templates', description: 'Send template messages' },
    { key: 'templates:manage_quota', label: 'Manage Quota', description: 'Manage template quota' },
  ],
  'Analytics': [
    { key: 'analytics:view_dashboard', label: 'View Dashboard', description: 'View analytics dashboard' },
    { key: 'analytics:view_reports', label: 'View Reports', description: 'View detailed reports' },
    { key: 'analytics:export', label: 'Export Reports', description: 'Export analytics data' },
    { key: 'analytics:view_revenue', label: 'View Revenue', description: 'View revenue metrics' },
  ],
  'Settings': [
    { key: 'settings:view', label: 'View Settings', description: 'View workspace settings' },
    { key: 'settings:update', label: 'Update Settings', description: 'Modify settings' },
    { key: 'settings:webhooks', label: 'Manage Webhooks', description: 'Configure webhooks' },
  ],
  'Testing & Development': [
    { key: 'users:impersonate', label: 'Impersonate Users', description: 'Switch to another user for testing' },
    { key: 'users:view_all', label: 'View All Users', description: 'View all workspace users' },
  ],
};

// Default role permissions - matches backend ROLE_PERMISSIONS
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: Object.values(PERMISSIONS_BY_CATEGORY).flat().map(p => p.key), // All permissions
  admin: Object.values(PERMISSIONS_BY_CATEGORY).flat().map(p => p.key).filter(p => 
    p !== 'workspace:delete' && p !== 'workspace:billing' && p !== 'users:impersonate' && p !== 'users:view_all'
  ),
  manager: [
    'workspace:view',
    'team:view',
    'integrations:view',
    'contacts:view', 'contacts:create', 'contacts:update',
    'conversations:view_all', 'conversations:view_assigned', 'conversations:send', 'conversations:assign', 'conversations:close',
    'orders:view', 'orders:confirm', 'orders:cancel', 'orders:export',
    'automations:view',
    'templates:view', 'templates:send',
    'analytics:view_dashboard', 'analytics:view_reports', 'analytics:view_revenue',
    'settings:view',
  ],
  agent: [
    'workspace:view',
    'contacts:view',
    'conversations:view_all', 'conversations:view_assigned', 'conversations:send',
    'orders:view',
    'automations:view',
    'templates:view', 'templates:send',
    'analytics:view_dashboard',
  ],
  viewer: [
    'workspace:view',
    'contacts:view',
    'conversations:view_all', 'conversations:view_assigned',
    'orders:view',
    'automations:view',
    'templates:view',
    'analytics:view_dashboard',
  ],
};

export default function PermissionsPage() {
  const { hasPermission, role: currentRole } = usePermissions();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const roles = [
    { key: 'owner', label: 'Owner', color: 'purple', description: 'Full control including billing & deletion' },
    { key: 'admin', label: 'Admin', color: 'blue', description: 'Full control except billing & workspace deletion' },
    { key: 'manager', label: 'Manager', color: 'green', description: 'Team & operations management' },
    { key: 'agent', label: 'Agent', color: 'orange', description: 'Customer-facing operations' },
    { key: 'viewer', label: 'Viewer', color: 'gray', description: 'Read-only access' },
  ];

  const roleColors: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-600" />
            Role & Permission Management
          </h1>
          <p className="text-gray-600 mt-1">
            View and understand role-based access control for your workspace
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Permission System Overview</p>
            <p className="text-sm text-blue-700 mt-1">
              Roles have predefined permissions that control what users can view and modify. 
              The Owner (you) has special testing permissions to impersonate other users.
            </p>
          </div>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {roles.map((roleInfo) => {
          const permissionCount = ROLE_PERMISSIONS[roleInfo.key]?.length || 0;
          const totalPermissions = Object.values(PERMISSIONS_BY_CATEGORY).flat().length;
          const percentage = Math.round((permissionCount / totalPermissions) * 100);

          return (
            <button
              key={roleInfo.key}
              onClick={() => setSelectedRole(selectedRole === roleInfo.key ? 'all' : roleInfo.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                selectedRole === roleInfo.key
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 text-xs font-bold uppercase rounded border ${
                  roleColors[roleInfo.color]
                }`}>
                  {roleInfo.label}
                </span>
                {roleInfo.key === currentRole && (
                  <span className="text-xs text-purple-600 font-medium">You</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{roleInfo.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700">{percentage}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {permissionCount} of {totalPermissions} permissions
              </p>
            </button>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Permission Matrix
          </h2>
          <p className="text-sm opacity-90 mt-1">
            {selectedRole === 'all' 
              ? 'All permissions across all roles' 
              : `Showing permissions for ${roles.find(r => r.key === selectedRole)?.label}`
            }
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {Object.entries(PERMISSIONS_BY_CATEGORY).map(([category, permissions]) => {
            const isExpanded = expandedCategories.includes(category);
            const relevantPermissions = selectedRole === 'all' 
              ? permissions 
              : permissions.filter(p => ROLE_PERMISSIONS[selectedRole]?.includes(p.key));

            if (selectedRole !== 'all' && relevantPermissions.length === 0) {
              return null;
            }

            return (
              <div key={category} className="hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900">{category}</h3>
                    <span className="text-xs text-gray-500">
                      ({selectedRole === 'all' ? permissions.length : relevantPermissions.length} permissions)
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="space-y-2">
                      {(selectedRole === 'all' ? permissions : relevantPermissions).map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-start gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                {permission.key}
                              </code>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {permission.label}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {permission.description}
                            </p>
                          </div>

                          {/* Role indicators */}
                          <div className="flex gap-1">
                            {roles.map((roleInfo) => {
                              const hasAccess = ROLE_PERMISSIONS[roleInfo.key]?.includes(permission.key);
                              return (
                                <div
                                  key={roleInfo.key}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                    hasAccess
                                      ? 'bg-green-100 border-green-500'
                                      : 'bg-gray-100 border-gray-300'
                                  }`}
                                  title={`${roleInfo.label}: ${hasAccess ? 'Has access' : 'No access'}`}
                                >
                                  {hasAccess ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          {roles.map((roleInfo) => (
            <div key={roleInfo.key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full border-2 bg-green-100 border-green-500 flex items-center justify-center`}>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              </div>
              <span className={`font-medium ${roleColors[roleInfo.color]} px-2 py-0.5 rounded`}>
                {roleInfo.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
