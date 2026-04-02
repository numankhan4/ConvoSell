import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { WorkspaceId } from '../decorators/user.decorator';

@Controller('health')
export class HealthCheckController {
  constructor(private healthCheckService: HealthCheckService) {}

  /**
   * Get health status for current workspace
   * GET /api/health/workspace
   */
  @Get('workspace')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getWorkspaceHealth(@WorkspaceId() workspaceId: string) {
    return this.healthCheckService.getWorkspaceIntegrationStatus(workspaceId);
  }

  /**
   * Get overall system health (admin only in production)
   * GET /api/health/system
   */
  @Get('system')
  async getSystemHealth() {
    const whatsappHealth = await this.healthCheckService.checkAllWhatsAppIntegrations();
    
    return {
      status: whatsappHealth.error > 0 ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      integrations: {
        whatsapp: whatsappHealth,
      },
    };
  }
}
