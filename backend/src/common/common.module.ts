import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionService } from './services/permission.service';
import { PermissionGuard } from './guards/permission.guard';
import { AuditRetentionService } from './services/audit-retention.service';
import { ExportDlpService } from './services/export-dlp.service';

/**
 * Global common module providing shared services and utilities
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionService, PermissionGuard, AuditRetentionService, ExportDlpService],
  exports: [PermissionService, PermissionGuard, AuditRetentionService, ExportDlpService],
})
export class CommonModule {}
