import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Enforce tenant isolation by validating workspaceId from request
 * Attaches workspaceId to request object for downstream use
 * 
 * Expects `workspaceId` in:
 * - Headers: x-workspace-id
 * - Query params: workspaceId
 * - Body: workspaceId
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    // Extract workspace ID from request
    const workspaceId =
      request.headers['x-workspace-id'] ||
      request.query.workspaceId ||
      request.body?.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }

    // Verify user has access to this workspace
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.sub,
        isActive: true,
      },
      include: {
        workspace: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    if (!membership.workspace.isActive) {
      throw new ForbiddenException('Workspace is inactive');
    }

    // Attach workspace context to request
    request.workspaceId = workspaceId;
    request.workspaceRole = membership.role;

    return true;
  }
}
