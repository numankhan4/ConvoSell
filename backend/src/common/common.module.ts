import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionService } from './services/permission.service';
import { PermissionGuard } from './guards/permission.guard';

/**
 * Global common module providing shared services and utilities
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class CommonModule {}
