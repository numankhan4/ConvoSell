import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { WhatsAppCronService } from './whatsapp-cron.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [SettingsController],
  providers: [SettingsService, WhatsAppTokenService, WhatsAppCronService],
  exports: [SettingsService, WhatsAppTokenService],
})
export class SettingsModule implements OnModuleInit {
  constructor(private whatsappCronService: WhatsAppCronService) {}

  onModuleInit() {
    // Start daily token refresh check
    this.whatsappCronService.startDailyRefresh();
  }
}
