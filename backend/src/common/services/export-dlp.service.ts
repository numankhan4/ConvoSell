import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportDlpService {
  private readonly logger = new Logger(ExportDlpService.name);
  private static readonly DEFAULT_WINDOW_HOURS = 24;
  private static readonly DEFAULT_EVENT_THRESHOLD = 5;
  private static readonly DEFAULT_RECORD_THRESHOLD = 1000;

  constructor(private prisma: PrismaService) {}

  private parsePositiveInt(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) return fallback;
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getConfig() {
    const windowHours = this.parsePositiveInt(
      process.env.DLP_EXPORT_ALERT_WINDOW_HOURS,
      ExportDlpService.DEFAULT_WINDOW_HOURS,
    );
    const eventThreshold = this.parsePositiveInt(
      process.env.DLP_EXPORT_ALERT_THRESHOLD,
      ExportDlpService.DEFAULT_EVENT_THRESHOLD,
    );
    const recordThreshold = this.parsePositiveInt(
      process.env.DLP_EXPORT_RECORD_THRESHOLD,
      ExportDlpService.DEFAULT_RECORD_THRESHOLD,
    );

    return { windowHours, eventThreshold, recordThreshold };
  }

  async evaluateAndAlert(
    workspaceId: string,
    action: 'contacts.export' | 'orders.export',
    exportedCount: number,
    format: 'json' | 'csv',
  ): Promise<void> {
    const { windowHours, eventThreshold, recordThreshold } = this.getConfig();
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const [recentExports, recentAlerts] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          workspaceId,
          action: { in: ['contacts.export', 'orders.export'] },
          createdAt: { gte: windowStart },
        },
        select: {
          action: true,
          metadata: true,
        },
      }),
      this.prisma.auditLog.count({
        where: {
          workspaceId,
          action: 'dlp.export_alert.warning',
          createdAt: { gte: windowStart },
        },
      }),
    ]);

    const exportEventCount = recentExports.length;
    const exportRecordCount = recentExports.reduce((sum, row) => {
      const count = Number((row.metadata as any)?.count || 0);
      return sum + (Number.isFinite(count) ? count : 0);
    }, 0);

    const shouldAlert =
      exportEventCount >= eventThreshold || exportRecordCount >= recordThreshold;

    // Avoid repeating the same alert too frequently within the same window.
    if (!shouldAlert || recentAlerts > 0) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        action: 'dlp.export_alert.warning',
        entityType: 'dlp',
        entityId: workspaceId,
        metadata: {
          triggerAction: action,
          triggerFormat: format,
          triggerCount: exportedCount,
          windowHours,
          exportEventCount,
          exportRecordCount,
          eventThreshold,
          recordThreshold,
        },
      },
    });

    this.logger.warn(
      `DLP export alert emitted for workspace ${workspaceId}: ${exportEventCount} events / ${exportRecordCount} records in ${windowHours}h`,
    );
  }
}
