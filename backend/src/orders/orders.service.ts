import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  /**
   * Get orders for workspace (filtered by active Shopify store)
   */
  async getOrders(workspaceId: string, params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    console.log('🔍 getOrders called with:', {
      workspaceId,
      page,
      limit,
      skip,
      status: params.status,
      search: params.search,
    });

    // Get active Shopify store ID for filtering
    const activeStoreId = await this.settingsService.getActiveShopifyStoreId(workspaceId);
    
    console.log('🏪 Active Shopify Store ID:', activeStoreId);

    const where: any = { 
      workspaceId,
      // Filter by active store if one exists
      ...(activeStoreId && { shopifyStoreId: activeStoreId }),
    };
    
    // Status filter
    if (params.status) {
      where.status = params.status;
    }

    // Search filter (order number, customer name, phone)
    if (params.search) {
      where.OR = [
        { externalOrderNumber: { contains: params.search, mode: 'insensitive' } },
        { externalOrderId: { contains: params.search, mode: 'insensitive' } },
        { contact: { name: { contains: params.search, mode: 'insensitive' } } },
        { contact: { whatsappPhone: { contains: params.search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              whatsappPhone: true,
            },
          },
          shopifyStore: {
            select: {
              id: true,
              shopDomain: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    console.log('✅ Query result:', {
      ordersReturned: orders.length,
      total,
      requestedLimit: limit,
      calculatedPages: Math.ceil(total / limit),
    });

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order
   */
  async getOrder(workspaceId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, workspaceId },
      include: {
        contact: true,
        shopifyStore: {
          select: {
            id: true,
            shopDomain: true,
          },
        },
      },
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(workspaceId: string, orderId: string, status: string) {
    const updateData: any = { status };

    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    } else if (status === 'completed') {
      updateData.deliveredAt = new Date();
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        action: 'order.status_updated',
        entityType: 'order',
        entityId: orderId,
        metadata: { oldStatus: status, newStatus: status },
      },
    });

    return order;
  }

  /**
   * Get order statistics
   */
  async getStatistics(workspaceId: string, statusFilter?: string) {
    // Get active Shopify store ID for filtering
    const activeStoreId = await this.settingsService.getActiveShopifyStoreId(workspaceId);
    
    // Base where clause - filter by active store
    const baseWhere: any = { 
      workspaceId,
      ...(activeStoreId && { shopifyStoreId: activeStoreId }),
    };
    
    if (statusFilter && statusFilter !== 'all') {
      baseWhere.status = statusFilter;
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      completedOrders,
      expectedRevenue,
      realizedRevenue,
      pendingValue,
      avgResponseTime,
    ] = await Promise.all([
      this.prisma.order.count({ where: baseWhere }),
      this.prisma.order.count({ where: { ...baseWhere, status: 'pending' } }),
      this.prisma.order.count({ where: { ...baseWhere, status: 'confirmed' } }),
      this.prisma.order.count({ where: { ...baseWhere, status: 'cancelled' } }),
      this.prisma.order.count({ where: { ...baseWhere, status: 'completed' } }),
      this.prisma.order.aggregate({
        where: { ...baseWhere, status: { in: ['confirmed', 'completed'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...baseWhere, status: 'completed' },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...baseWhere, status: 'pending' },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { 
          ...baseWhere, 
          responseTimeMinutes: { not: null },
          status: { in: ['confirmed', 'cancelled'] }
        },
        _avg: { responseTimeMinutes: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      completedOrders,
      // Backward-compatible alias used by current dashboard card.
      totalRevenue: expectedRevenue._sum.totalAmount || 0,
      expectedRevenue: expectedRevenue._sum.totalAmount || 0,
      realizedRevenue: realizedRevenue._sum.totalAmount || 0,
      pendingValue: pendingValue._sum.totalAmount || 0,
      avgResponseTime: avgResponseTime._avg.responseTimeMinutes || null,
    };
  }
}
