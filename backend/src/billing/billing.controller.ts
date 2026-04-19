import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/guards/roles.guard';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { BillingService } from './billing.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('workspace')
  getWorkspaceBilling(@WorkspaceId() workspaceId: string) {
    return this.billingService.getWorkspaceBilling(workspaceId);
  }

  @Get('plans')
  getPlans(@WorkspaceId() workspaceId: string) {
    return this.billingService.getWorkspaceBilling(workspaceId);
  }

  @Post('upgrade')
  @Roles('owner')
  upgradePlan(@WorkspaceId() workspaceId: string, @Body() dto: UpgradePlanDto) {
    return this.billingService.upgradePlan(workspaceId, dto.targetPlan, dto.billingCycle!);
  }
}
