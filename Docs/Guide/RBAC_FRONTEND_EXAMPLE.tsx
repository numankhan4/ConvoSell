/**
 * Example: How to add RBAC to Settings Page
 * 
 * This shows what changes to make to enable role-based UI
 */

'use client';

import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

export default function SettingsPageWithRBAC() {
  const { isOwner, isAdmin, hasPermission, role } = usePermissions();

  return (
    <div className="p-6">
      {/* Show role badge */}
      <div className="mb-4">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold uppercase">
          {role}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tabs - only show certain tabs to admins */}
      <div className="flex gap-4 mb-6">
        <button>WhatsApp</button>
        <button>Shopify</button>
        
        {/* Team tab only for owners/admins */}
        <PermissionGate permission={Permissions.TEAM_VIEW}>
          <button>Team Management</button>
        </PermissionGate>

        {/* Billing only for owners */}
        <PermissionGate permission={Permissions.WORKSPACE_BILLING}>
          <button>Billing</button>
        </PermissionGate>
      </div>

      {/* Integration settings */}
      <div className="space-y-6">
        {/* View-only for viewers */}
        <PermissionGate 
          permission={Permissions.INTEGRATIONS_VIEW}
          fallback={<p>You don't have access to view integrations</p>}
        >
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">WhatsApp Integration</h2>
            
            {/* Show connection status to everyone with view permission */}
            <div className="mb-4">
              <p>Status: Connected ✅</p>
              <p>Phone: +1234567890</p>
            </div>

            {/* Only admins can connect/disconnect */}
            <PermissionGate permission={Permissions.INTEGRATIONS_CONNECT}>
              <button className="btn-primary mr-2">
                Update Configuration
              </button>
            </PermissionGate>

            <PermissionGate permission={Permissions.INTEGRATIONS_DISCONNECT}>
              <button className="btn-danger">
                Disconnect
              </button>
            </PermissionGate>
          </div>
        </PermissionGate>

        {/* Owner-only section */}
        <PermissionGate permission={Permissions.WORKSPACE_DELETE}>
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-4">
              Danger Zone (Owner Only)
            </h2>
            <button className="btn-danger">
              Delete Workspace
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Alternative: Using hooks instead of components */}
      <div className="mt-8">
        {hasPermission(Permissions.ANALYTICS_VIEW_REVENUE) && (
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold">Revenue Analytics (Manager+)</h3>
            <p>Total Revenue: $12,345</p>
          </div>
        )}

        {isOwner && (
          <div className="mt-4 p-4 bg-purple-50 rounded">
            <h3 className="font-semibold">👑 Owner Controls</h3>
            <p>You have full access to all features</p>
          </div>
        )}

        {isAdmin && !isOwner && (
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold">🔧 Admin Controls</h3>
            <p>You can manage the workspace except billing</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * WHAT USERS SEE BY ROLE:
 * 
 * VIEWER:
 * - View integration status
 * - No buttons to modify anything
 * - No access to team or billing tabs
 * 
 * AGENT:
 * - View integration status
 * - Can send messages
 * - No access to settings modifications
 * 
 * MANAGER:
 * - View integrations
 * - View revenue analytics
 * - Can configure some settings
 * - No billing or workspace deletion
 * 
 * ADMIN:
 * - All manager permissions
 * - Can connect/disconnect integrations
 * - Can manage team members
 * - View team management tab
 * - Still no billing access
 * 
 * OWNER:
 * - Everything
 * - Billing tab visible
 * - Delete workspace button visible
 * - All admin features + more
 */
