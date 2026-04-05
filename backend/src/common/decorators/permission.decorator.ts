import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permissions.constants';

/**
 * Decorator to require a specific permission for route access
 * Usage: @RequirePermission(Permission.CONTACTS_CREATE)
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata('permission', permission);

/**
 * Decorator to require any of the specified permissions
 * Usage: @RequireAnyPermission([Permission.CONTACTS_CREATE, Permission.CONTACTS_UPDATE])
 */
export const RequireAnyPermission = (permissions: Permission[]) =>
  SetMetadata('anyPermissions', permissions);

/**
 * Decorator to require all of the specified permissions
 * Usage: @RequireAllPermissions([Permission.CONTACTS_CREATE, Permission.CONTACTS_EXPORT])
 */
export const RequireAllPermissions = (permissions: Permission[]) =>
  SetMetadata('allPermissions', permissions);
