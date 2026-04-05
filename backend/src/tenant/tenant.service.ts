import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PermissionService } from '../common/services/permission.service';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private permissionService: PermissionService,
  ) {}

  /**
   * Get workspace details
   */
  async getWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  /**
   * Update workspace settings
   */
  async updateWorkspace(workspaceId: string, data: { name?: string }) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(
    workspaceId: string,
    email: string,
    role: string = 'agent',
  ) {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // In production, send invite email instead
      throw new NotFoundException('User not found. Invite feature coming soon.');
    }

    // Check if already a member
    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException('User is already a member');
    }

    // Add member
    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
    });
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  /**
   * Get workspace member with permissions
   */
  async getWorkspaceMemberWithPermissions(
    workspaceId: string,
    userId: string,
  ) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Get permissions for the member
    const permissions = await this.permissionService.getUserPermissions(
      userId,
      workspaceId,
    );

    return {
      ...member,
      permissions,
    };
  }
}
