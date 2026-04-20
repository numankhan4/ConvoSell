import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { CreateWhatsAppIntegrationDto, UpdateWhatsAppIntegrationDto } from './dto/whatsapp-integration.dto';
import { CreateShopifyStoreDto, UpdateShopifyStoreDto } from './dto/shopify-store.dto';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private whatsappTokenService: WhatsAppTokenService,
  ) {}

  // ============================================================
  // ORDER VERIFICATION POLICY
  // ============================================================

  @Get('order-verification')
  async getOrderVerificationSettings(@Request() req) {
    return this.settingsService.getOrderVerificationSettings(req.user.workspaceId);
  }

  @Put('order-verification')
  async updateOrderVerificationSettings(
    @Request() req,
    @Body()
    dto: {
      enabled?: boolean;
      scope?: 'cod_only' | 'all_orders';
      firstFollowupMinutes?: number;
      finalTimeoutMinutes?: number;
      maxFollowups?: number;
      readAwareEscalation?: boolean;
    },
  ) {
    return this.settingsService.updateOrderVerificationSettings(req.user.workspaceId, dto);
  }

  // ============================================================
  // CART RECOVERY POLICY
  // ============================================================

  @Get('cart-recovery')
  async getCartRecoverySettings(@Request() req) {
    return this.settingsService.getCartRecoverySettings(req.user.workspaceId);
  }

  @Put('cart-recovery')
  async updateCartRecoverySettings(
    @Request() req,
    @Body()
    dto: {
      enabled?: boolean;
      firstReminderHours?: number;
      secondReminderHours?: number;
      maxReminders?: number;
      minCartValue?: number;
    },
  ) {
    return this.settingsService.updateCartRecoverySettings(req.user.workspaceId, dto);
  }

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

  // Soft delete (disconnect with 30-day grace period)
  @Post('whatsapp/:id/disconnect')
  async disconnectWhatsAppIntegration(@Request() req, @Param('id') id: string) {
    return this.settingsService.disconnectWhatsAppIntegration(
      req.user.workspaceId,
      id,
      req.user.sub, // userId
    );
  }

  // Restore disconnected integration
  @Post('whatsapp/:id/restore')
  async restoreWhatsAppIntegration(@Request() req, @Param('id') id: string) {
    return this.settingsService.restoreWhatsAppIntegration(req.user.workspaceId, id);
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

  @Get('whatsapp/alerts')
  @UseGuards(TenantGuard)
  async getWhatsAppAlerts(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
  ) {
    const allowedRoles = new Set(['owner', 'admin', 'manager']);
    if (!allowedRoles.has(req.workspaceRole)) {
      throw new ForbiddenException('Only owner, admin, or manager can view operational alerts');
    }

    return this.settingsService.getWhatsAppAlerts(
      req.workspaceId,
      limit ? Number(limit) : undefined,
      severity,
    );
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

  @Get('currency')
  async getWorkspaceCurrency(@Request() req) {
    return this.settingsService.getWorkspaceCurrency(req.user.workspaceId);
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

  // Soft delete (disconnect with 90-day grace period)
  @Post('shopify/:id/disconnect')
  async disconnectShopifyStore(@Request() req, @Param('id') id: string) {
    return this.settingsService.disconnectShopifyStore(
      req.user.workspaceId,
      id,
      req.user.sub, // userId
    );
  }

  // Restore disconnected store
  @Post('shopify/:id/restore')
  async restoreShopifyStore(@Request() req, @Param('id') id: string) {
    return this.settingsService.restoreShopifyStore(req.user.workspaceId, id);
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
