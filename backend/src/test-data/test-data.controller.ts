import { Controller, Post, Delete, Get, UseGuards } from '@nestjs/common';
import { TestDataService } from './test-data.service';
import { CurrentUser, WorkspaceId } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('test-data')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TestDataController {
  constructor(private testDataService: TestDataService) {}

  /**
   * POST /api/test-data/generate
   * Generate dummy test data for testing
   * NOTE: Frontend restricts to owner role
   */
  @Post('generate')
  async generateTestData(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: any,
  ) {
    return this.testDataService.generateTestData(workspaceId);
  }

  /**
   * DELETE /api/test-data
   * Delete all test data from workspace
   * NOTE: Frontend restricts to owner role
   */
  @Delete()
  async deleteTestData(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: any,
  ) {
    return this.testDataService.deleteTestData(workspaceId);
  }

  /**
   * GET /api/test-data/stats
   * Get current data statistics
   */
  @Get('stats')
  async getDataStats(
    @WorkspaceId() workspaceId: string,
  ) {
    return this.testDataService.getDataStats(workspaceId);
  }
}
