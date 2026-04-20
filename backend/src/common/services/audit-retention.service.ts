import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);
  private static readonly DEFAULT_RETENTION_DAYS = 365;
  private static readonly MIN_RETENTION_DAYS = 30;

  constructor(private prisma: PrismaService) {}

  private getRetentionDays(): number {
    const raw = process.env.AUDIT_LOG_RETENTION_DAYS;
    if (!raw) {
      return AuditRetentionService.DEFAULT_RETENTION_DAYS;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < AuditRetentionService.MIN_RETENTION_DAYS) {
      this.logger.warn(
        `Invalid AUDIT_LOG_RETENTION_DAYS value "${raw}". Falling back to ${AuditRetentionService.DEFAULT_RETENTION_DAYS} days.`,
      );
      return AuditRetentionService.DEFAULT_RETENTION_DAYS;
    }

    return parsed;
  }

  async cleanupExpiredAuditLogs(): Promise<{
    retentionDays: number;
    cutoffDate: Date;
    deleted: number;
  }> {
    const retentionDays = this.getRetentionDays();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Deleted ${result.count} audit logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
      );
    }

    return {
      retentionDays,
      cutoffDate,
      deleted: result.count,
    };
  }
}