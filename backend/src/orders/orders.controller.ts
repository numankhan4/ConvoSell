import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { Permission } from '../common/constants/permissions.constants';

@Controller('orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  getOrders(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    
    return this.ordersService.getOrders(workspaceId, { 
      status, 
      search, 
      page: pageNum, 
      limit: limitNum 
    });
  }

  @Get('statistics')
  getStatistics(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getStatistics(workspaceId, status);
  }

  @Get('export')
  @RequirePermission(Permission.ORDERS_EXPORT)
  exportOrders(
    @WorkspaceId() workspaceId: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    return this.ordersService.exportOrders(workspaceId, format || 'json');
  }

  @Get(':id')
  getOrder(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.ordersService.getOrder(workspaceId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() data: { status: string },
  ) {
    return this.ordersService.updateOrderStatus(workspaceId, id, data.status);
  }
}
