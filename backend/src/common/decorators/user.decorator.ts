import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract authenticated user from request
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Extract workspace ID from request (set by TenantGuard)
 * Usage: @WorkspaceId() workspaceId: string
 */
export const WorkspaceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspaceId;
  },
);
