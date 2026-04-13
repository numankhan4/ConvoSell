import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  private async writeReadAudit(
    workspaceId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          action,
          entityType,
          entityId,
          metadata,
        },
      });
    } catch {
      // Never block core read operations on audit log failures.
    }
  }

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

    // Get active Shopify store ID for filtering
    const activeStoreId = await this.settingsService.getActiveShopifyStoreId(workspaceId);

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
          fraudAssessments: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
            select: {
              finalFraudScore: true,
              riskLevel: true,
              fraudDecision: true,
              checkedAt: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const withFraudSummary = orders.map((order) => {
      const latestFraud = order.fraudAssessments?.[0] || null;
      return {
        ...order,
        fraudSummary: latestFraud
          ? {
              final_fraud_score: latestFraud.finalFraudScore,
              risk_level: latestFraud.riskLevel,
              fraud_decision: latestFraud.fraudDecision,
              checked_at: latestFraud.checkedAt,
            }
          : null,
      };
    });

    return {
      data: withFraudSummary,
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
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, workspaceId },
      include: {
        contact: true,
        shopifyStore: {
          select: {
            id: true,
            shopDomain: true,
          },
        },
        fraudAssessments: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
          select: {
            finalFraudScore: true,
            riskLevel: true,
            fraudDecision: true,
            checkedAt: true,
          },
        },
      },
    });

    await this.writeReadAudit(workspaceId, 'order.detail.view', 'order', orderId, {
      found: !!order,
    });

    if (!order) {
      return null;
    }

    const latestFraud = order.fraudAssessments?.[0] || null;
    return {
      ...order,
      fraudSummary: latestFraud
        ? {
            final_fraud_score: latestFraud.finalFraudScore,
            risk_level: latestFraud.riskLevel,
            fraud_decision: latestFraud.fraudDecision,
            checked_at: latestFraud.checkedAt,
          }
        : null,
    };
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
      fakeOrders,
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
      this.prisma.order.count({ where: { ...baseWhere, status: 'fake' } }),
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
      fakeOrders,
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

  /**
   * Export orders in JSON or CSV format.
   */
  async exportOrders(workspaceId: string, format: 'json' | 'csv' = 'json') {
    const activeStoreId = await this.settingsService.getActiveShopifyStoreId(workspaceId);

    const where: any = {
      workspaceId,
      ...(activeStoreId && { shopifyStoreId: activeStoreId }),
    };

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        externalOrderNumber: true,
        externalOrderId: true,
        status: true,
        totalAmount: true,
        currency: true,
        paymentMethod: true,
        createdAt: true,
        confirmedAt: true,
        cancelledAt: true,
        deliveredAt: true,
      },
    });

    await this.writeReadAudit(workspaceId, 'orders.export', 'order', null, {
      format,
      count: orders.length,
      activeStoreOnly: !!activeStoreId,
    });

    if (format === 'csv') {
      const escapeCsv = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const raw = String(value);
        return `"${raw.replace(/"/g, '""')}"`;
      };

      const header = [
        'id',
        'externalOrderNumber',
        'externalOrderId',
        'status',
        'totalAmount',
        'currency',
        'paymentMethod',
        'createdAt',
        'confirmedAt',
        'cancelledAt',
        'deliveredAt',
      ];

      const rows = orders.map((order) => [
        escapeCsv(order.id),
        escapeCsv(order.externalOrderNumber),
        escapeCsv(order.externalOrderId),
        escapeCsv(order.status),
        escapeCsv(order.totalAmount),
        escapeCsv(order.currency),
        escapeCsv(order.paymentMethod),
        escapeCsv(order.createdAt.toISOString()),
        escapeCsv(order.confirmedAt?.toISOString()),
        escapeCsv(order.cancelledAt?.toISOString()),
        escapeCsv(order.deliveredAt?.toISOString()),
      ]);

      return {
        format,
        filename: `orders-export-${new Date().toISOString().slice(0, 10)}.csv`,
        generatedAt: new Date().toISOString(),
        count: orders.length,
        data: [header.join(','), ...rows.map((row) => row.join(','))].join('\n'),
      };
    }

    return {
      format,
      filename: `orders-export-${new Date().toISOString().slice(0, 10)}.json`,
      generatedAt: new Date().toISOString(),
      count: orders.length,
      data: orders,
    };
  }
}
