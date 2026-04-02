import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/guards/roles.guard';

@Controller('automations')
@UseGuards(TenantGuard)
export class AutomationsController {
  constructor(private automationsService: AutomationsService) {}

  @Get()
  getAutomations(@WorkspaceId() workspaceId: string) {
    return this.automationsService.getAutomations(workspaceId);
  }

  @Post()
  @Roles('owner', 'admin')
  createAutomation(
    @WorkspaceId() workspaceId: string,
    @Body() data: any,
  ) {
    return this.automationsService.createAutomation(workspaceId, data);
  }

  @Patch(':id/toggle')
  @Roles('owner', 'admin')
  toggleAutomation(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() data: { isActive: boolean },
  ) {
    return this.automationsService.toggleAutomation(workspaceId, id, data.isActive);
  }

  @Post('execute/:orderId')
  @Roles('owner', 'admin', 'agent')
  async executeManually(
    @WorkspaceId() workspaceId: string,
    @Param('orderId') orderId: string,
    @Body() data: { automationId?: string },
  ) {
    return this.automationsService.executeManuallyForOrder(
      workspaceId,
      orderId,
      data.automationId,
    );
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  deleteAutomation(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.deleteAutomation(workspaceId, id);
  }

  @Post('delete-multiple')
  @Roles('owner', 'admin')
  deleteMultiple(
    @WorkspaceId() workspaceId: string,
    @Body() data: { automationIds: string[] },
  ) {
    return this.automationsService.deleteMultipleAutomations(workspaceId, data.automationIds);
  }
}
