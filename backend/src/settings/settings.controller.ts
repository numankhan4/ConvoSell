import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { CreateWhatsAppIntegrationDto, UpdateWhatsAppIntegrationDto } from './dto/whatsapp-integration.dto';
import { CreateShopifyStoreDto, UpdateShopifyStoreDto } from './dto/shopify-store.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private whatsappTokenService: WhatsAppTokenService,
  ) {}

  // ============================================================
  // WHATSAPP INTEGRATION
  // ============================================================

  @Get('whatsapp')
  async getWhatsAppIntegration(@Request() req) {
    return this.settingsService.getWhatsAppIntegration(req.user.workspaceId);
  }

  @Post('whatsapp')
  async createWhatsAppIntegration(@Request() req, @Body() dto: CreateWhatsAppIntegrationDto) {
    return this.settingsService.createWhatsAppIntegration(req.user.workspaceId, dto);
  }

  @Put('whatsapp/:id')
  async updateWhatsAppIntegration(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsAppIntegrationDto,
  ) {
    return this.settingsService.updateWhatsAppIntegration(req.user.workspaceId, id, dto);
  }

  @Delete('whatsapp/:id')
  async deleteWhatsAppIntegration(@Request() req, @Param('id') id: string) {
    return this.settingsService.deleteWhatsAppIntegration(req.user.workspaceId, id);
  }

  @Post('whatsapp/test')
  async testWhatsAppConnection(@Body() credentials: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  }) {
    return this.settingsService.testWhatsAppConnection(credentials);
  }

  @Post('whatsapp/:id/health-check')
  async checkWhatsAppHealth(@Request() req, @Param('id') id: string) {
    const result = await this.whatsappTokenService.updateHealthStatus(id);
    return {
      success: true,
      message: 'Health check completed',
      ...result,
    };
  }

  @Get('whatsapp/health-summary')
  async getWhatsAppHealthSummary(@Request() req) {
    return this.whatsappTokenService.getHealthSummary(req.user.workspaceId);
  }

  @Post('whatsapp/auto-refresh')
  async autoRefreshExpiringTokens() {
    return this.whatsappTokenService.autoRefreshExpiringTokens();
  }

  // ============================================================
  // SHOPIFY INTEGRATION
  // ============================================================

  @Get('shopify')
  async getShopifyStore(@Request() req) {
    return this.settingsService.getShopifyStore(req.user.workspaceId);
  }

  @Post('shopify')
  async createShopifyStore(@Request() req, @Body() dto: CreateShopifyStoreDto) {
    return this.settingsService.createShopifyStore(req.user.workspaceId, dto);
  }

  @Put('shopify/:id')
  async updateShopifyStore(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateShopifyStoreDto,
  ) {
    return this.settingsService.updateShopifyStore(req.user.workspaceId, id, dto);
  }

  @Delete('shopify/:id')
  async deleteShopifyStore(@Request() req, @Param('id') id: string) {
    return this.settingsService.deleteShopifyStore(req.user.workspaceId, id);
  }

  @Post('shopify/webhooks/register')
  async registerShopifyWebhooks(@Request() req) {
    return this.settingsService.registerShopifyWebhooks(req.user.workspaceId);
  }

  @Post('shopify/test')
  async testShopifyConnection(@Body() credentials: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
  }) {
    return this.settingsService.testShopifyConnection(credentials);
  }

  // ============================================================
  // WEBHOOK URLS
  // ============================================================

  @Get('webhook-urls')
  async getWebhookUrls(@Request() req) {
    return this.settingsService.getWebhookUrls(req.user.workspaceId);
  }
}
