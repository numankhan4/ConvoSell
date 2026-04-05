import { usePermissions } from '@/lib/hooks/usePermissions';
import { ReactNode } from 'react';

interface PermissionGateProps {
  /** Single permission required */
  permission?: string;
  
  /** Multiple permissions (checks if user has ANY) */
  permissions?: string[];
  
  /** If true with permissions array, requires ALL permissions instead of ANY */
  requireAll?: boolean;
  
  /** Content to show if user doesn't have permission */
  fallback?: ReactNode;
  
  /** Content to show if user has permission */
  children: ReactNode;
}

/**
 * Component to conditionally render content based on permissions
 * 
 * Usage:
 * ```tsx
 * <PermissionGate permission="contacts:create">
 *   <button>Create Contact</button>
 * </PermissionGate>
 * 
 * <PermissionGate permissions={['contacts:delete', 'contacts:update']} fallback={<p>No access</p>}>
 *   <button>Advanced Actions</button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let allowed = false;

  if (permission) {
    // Single permission check
    allowed = hasPermission(permission);
  } else if (permissions.length > 0) {
    // Multiple permissions check
    allowed = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // No permissions specified, allow by default
    allowed = true;
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for more complex use cases
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  fallback: ReactNode = null,
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Role-based gate (checks if user has specific role)
 */
interface RoleGateProps {
  roles: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { role } = usePermissions();

  if (!roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
