import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/guards/roles.guard';

@Controller('workspace')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get()
  getWorkspace(@WorkspaceId() workspaceId: string) {
    return this.tenantService.getWorkspace(workspaceId);
  }

  @Patch()
  @Roles('owner', 'admin')
  updateWorkspace(
    @WorkspaceId() workspaceId: string,
    @Body() data: { name?: string },
  ) {
    return this.tenantService.updateWorkspace(workspaceId, data);
  }

  @Post('members')
  @Roles('owner', 'admin')
  inviteMember(
    @WorkspaceId() workspaceId: string,
    @Body() data: { email: string; role?: string },
  ) {
    return this.tenantService.inviteMember(workspaceId, data.email, data.role);
  }

  @Delete('members/:userId')
  @Roles('owner', 'admin')
  removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantService.removeMember(workspaceId, userId);
  }
}
