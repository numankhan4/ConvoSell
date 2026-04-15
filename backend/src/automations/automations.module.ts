import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [WhatsAppModule, SettingsModule],
  providers: [AutomationsService],
  controllers: [AutomationsController],
  exports: [AutomationsService],
})
export class AutomationsModule {}
