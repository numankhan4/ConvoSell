import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../constants/permissions.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for single permission requirement
    const requiredPermission = this.reflector.get<Permission>(
      'permission',
      context.getHandler(),
    );

    // Check for any permissions requirement
    const anyPermissions = this.reflector.get<Permission[]>(
      'anyPermissions',
      context.getHandler(),
    );

    // Check for all permissions requirement
    const allPermissions = this.reflector.get<Permission[]>(
      'allPermissions',
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!requiredPermission && !anyPermissions && !allPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || request.user?.id;
    const workspaceId = request.workspaceId;

    if (!userId) {
      this.logger.warn('Permission check failed: No user ID found in request');
      throw new ForbiddenException('User authentication required');
    }

    if (!workspaceId) {
      this.logger.warn('Permission check failed: No workspace ID found in request');
      throw new ForbiddenException('Workspace context required');
    }

    try {
      // Check single permission
      if (requiredPermission) {
        const hasPermission = await this.permissionService.hasPermission(
          userId,
          workspaceId,
          requiredPermission,
        );

        if (!hasPermission) {
          this.logger.warn(
            `User ${userId} denied access: missing permission ${requiredPermission}`,
          );
          throw new ForbiddenException(
            `You don't have permission to ${requiredPermission.replace(':', ' ')}`,
          );
        }

        return true;
      }

      // Check any permissions
      if (anyPermissions && anyPermissions.length > 0) {
        const hasAny = await this.permissionService.hasAnyPermission(
          userId,
          workspaceId,
          anyPermissions,
        );

        if (!hasAny) {
          this.logger.warn(
            `User ${userId} denied access: missing any of permissions ${anyPermissions.join(', ')}`,
          );
          throw new ForbiddenException(
            'You don\'t have the required permissions to access this resource',
          );
        }

        return true;
      }

      // Check all permissions
      if (allPermissions && allPermissions.length > 0) {
        const hasAll = await this.permissionService.hasAllPermissions(
          userId,
          workspaceId,
          allPermissions,
        );

        if (!hasAll) {
          this.logger.warn(
            `User ${userId} denied access: missing all of permissions ${allPermissions.join(', ')}`,
          );
          throw new ForbiddenException(
            'You don\'t have all the required permissions to access this resource',
          );
        }

        return true;
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Error in permission guard:', error);
      throw new ForbiddenException('Permission check failed');
    }
  }
}
