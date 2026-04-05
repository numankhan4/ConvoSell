import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  Permission, 
  WorkspaceRole, 
  ROLE_PERMISSIONS,
  getRolePermissions,
} from '../constants/permissions.constants';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has a specific permission in workspace
   */
  async hasPermission(
    userId: string,
    workspaceId: string,
    permission: Permission,
  ): Promise<boolean> {
    try {
      // First check if user is super admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true, isActive: true },
      });

      // Super admins have all permissions
      if (user?.isSuperAdmin && user?.isActive) {
        this.logger.debug(`Super admin ${userId} granted permission ${permission}`);
        return true;
      }

      // Get workspace membership
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: {
          role: true,
          customPermissions: true,
          isActive: true,
        },
      });

      if (!member || !member.isActive) {
        this.logger.debug(`User ${userId} is not an active member of workspace ${workspaceId}`);
        return false;
      }

      // Check custom permissions first (overrides)
      const customPerms = (member.customPermissions as string[]) || [];
      if (customPerms.includes(permission)) {
        this.logger.debug(`User ${userId} has custom permission ${permission}`);
        return true;
      }

      // Check role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[member.role as WorkspaceRole] || [];
      const hasPermission = rolePermissions.includes(permission);

      if (hasPermission) {
        this.logger.debug(`User ${userId} with role ${member.role} has permission ${permission}`);
      } else {
        this.logger.debug(`User ${userId} with role ${member.role} lacks permission ${permission}`);
      }

      return hasPermission;
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    workspaceId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      const has = await this.hasPermission(userId, workspaceId, permission);
      if (has) return true;
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    workspaceId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      const has = await this.hasPermission(userId, workspaceId, permission);
      if (!has) return false;
    }
    return true;
  }

  /**
   * Get all permissions for user in workspace
   */
  async getUserPermissions(
    userId: string,
    workspaceId: string,
  ): Promise<Permission[]> {
    try {
      // Check if super admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true, isActive: true },
      });

      if (user?.isSuperAdmin && user?.isActive) {
        // Return all permissions
        return Object.values(Permission);
      }

      // Get workspace membership
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: {
          role: true,
          customPermissions: true,
          isActive: true,
        },
      });

      if (!member || !member.isActive) {
        return [];
      }

      // Get role permissions
      const rolePermissions = getRolePermissions(member.role as WorkspaceRole);
      
      // Get custom permissions
      const customPerms = (member.customPermissions as string[]) || [];

      // Merge and deduplicate
      const allPermissions = Array.from(
        new Set([...rolePermissions, ...customPerms])
      ) as Permission[];

      return allPermissions;
    } catch (error) {
      this.logger.error(`Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's role in workspace
   */
  async getUserRole(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole | null> {
    try {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: {
          role: true,
          isActive: true,
        },
      });

      if (!member || !member.isActive) {
        return null;
      }

      return member.role as WorkspaceRole;
    } catch (error) {
      this.logger.error(`Error getting role for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Check if user can assign a specific role to another user
   */
  canAssignRole(
    assignerRole: WorkspaceRole,
    targetRole: WorkspaceRole,
  ): boolean {
    // Owner can assign any role
    if (assignerRole === WorkspaceRole.OWNER) {
      return true;
    }

    // Admin can assign manager, agent, viewer (not owner or admin)
    if (assignerRole === WorkspaceRole.ADMIN) {
      return [
        WorkspaceRole.MANAGER,
        WorkspaceRole.AGENT,
        WorkspaceRole.VIEWER,
      ].includes(targetRole);
    }

    // Manager can assign agent, viewer (not owner, admin, or manager)
    if (assignerRole === WorkspaceRole.MANAGER) {
      return [
        WorkspaceRole.AGENT,
        WorkspaceRole.VIEWER,
      ].includes(targetRole);
    }

    // Agent and Viewer cannot assign roles
    return false;
  }

  /**
   * Check if user can remove another member
   */
  async canRemoveMember(
    actorId: string,
    workspaceId: string,
    targetMemberId: string,
  ): Promise<boolean> {
    // Get both members
    const [actor, target] = await Promise.all([
      this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: actorId,
          },
        },
        select: { role: true },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { id: targetMemberId },
        select: { role: true, userId: true },
      }),
    ]);

    if (!actor || !target) {
      return false;
    }

    // Cannot remove yourself
    if (target.userId === actorId) {
      return false;
    }

    // Cannot remove owner
    if (target.role === WorkspaceRole.OWNER) {
      return false;
    }

    // Owner can remove anyone (except themselves and other owners)
    if (actor.role === WorkspaceRole.OWNER) {
      return true;
    }

    // Admin can remove manager, agent, viewer
    if (actor.role === WorkspaceRole.ADMIN) {
      return [
        WorkspaceRole.MANAGER,
        WorkspaceRole.AGENT,
        WorkspaceRole.VIEWER,
      ].includes(target.role as WorkspaceRole);
    }

    // Manager can remove agent, viewer
    if (actor.role === WorkspaceRole.MANAGER) {
      return [
        WorkspaceRole.AGENT,
        WorkspaceRole.VIEWER,
      ].includes(target.role as WorkspaceRole);
    }

    return false;
  }

  /**
   * Add custom permission to user (override role permissions)
   */
  async addCustomPermission(
    userId: string,
    workspaceId: string,
    permission: Permission,
  ): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        customPermissions: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const customPerms = (member.customPermissions as string[]) || [];
    if (!customPerms.includes(permission)) {
      customPerms.push(permission);
      await this.prisma.workspaceMember.update({
        where: { id: member.id },
        data: {
          customPermissions: customPerms,
        },
      });
    }
  }

  /**
   * Remove custom permission from user
   */
  async removeCustomPermission(
    userId: string,
    workspaceId: string,
    permission: Permission,
  ): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        customPermissions: true,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const customPerms = ((member.customPermissions as string[]) || []).filter(
      (p) => p !== permission,
    );

    await this.prisma.workspaceMember.update({
      where: { id: member.id },
      data: {
        customPermissions: customPerms,
      },
    });
  }

  /**
   * Check if workspace is at member limit based on subscription
   */
  async canAddMember(workspaceId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        maxMembers: true,
        _count: {
          select: {
            members: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return false;
    }

    return workspace._count.members < workspace.maxMembers;
  }
}
