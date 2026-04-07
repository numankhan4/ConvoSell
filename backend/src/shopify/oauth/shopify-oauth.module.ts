import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShopifyOAuthController } from './shopify-oauth.controller';
import { ShopifyOAuthService } from './shopify-oauth.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [HttpModule, PrismaModule, SettingsModule],
  controllers: [ShopifyOAuthController],
  providers: [ShopifyOAuthService],
  exports: [ShopifyOAuthService],
})
export class ShopifyOAuthModule {}
