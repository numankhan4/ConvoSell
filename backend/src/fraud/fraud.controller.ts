import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FraudCheckDto } from './dto/fraud-check.dto';
import { FraudBatchCheckDto } from './dto/fraud-batch-check.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('check')
  @UseGuards(TenantGuard)
  async checkFraud(
    @WorkspaceId() workspaceId: string,
    @Body() dto: FraudCheckDto,
  ) {
    return this.fraudService.checkOrder(workspaceId, dto);
  }

  @Post('check-batch')
  @UseGuards(TenantGuard)
  async checkFraudBatch(
    @WorkspaceId() workspaceId: string,
    @Body() dto: FraudBatchCheckDto,
  ) {
    return this.fraudService.checkOrdersBatch(workspaceId, dto);
  }

  @Get('report/:orderId')
  @UseGuards(TenantGuard)
  async getFraudReport(
    @WorkspaceId() workspaceId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.fraudService.getOrderReport(workspaceId, orderId);
  }

  @Get('summaries')
  @UseGuards(TenantGuard)
  async getFraudSummaries(
    @WorkspaceId() workspaceId: string,
    @Query('orderIds') orderIdsQuery?: string,
  ) {
    const orderIds = (orderIdsQuery || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return this.fraudService.getFraudSummaries(workspaceId, orderIds);
  }

  @Public()
  @Post('internal/check')
  async checkFraudInternal(
    @Body() dto: FraudCheckDto,
    @Headers('x-internal-worker-key') internalKey?: string,
  ) {
    return this.fraudService.checkOrderFromWorker(dto, internalKey);
  }
}
