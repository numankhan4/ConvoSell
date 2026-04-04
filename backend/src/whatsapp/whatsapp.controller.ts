import { Controller, Post, Get, Body, Query, Param, Req, Headers, Res, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../common/decorators/public.decorator';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private whatsappService: WhatsAppService,
    private prisma: PrismaService,
  ) {}

  /**
   * POST /api/whatsapp/send
   * Send a WhatsApp message
   */
  @Post('send')
  @UseGuards(TenantGuard)
  async sendMessage(
    @WorkspaceId() workspaceId: string,
    @Body() dto: { to: string; message: string },
  ) {
    return this.whatsappService.sendTextMessage(workspaceId, dto.to, dto.message);
  }

  /**
   * POST /api/whatsapp/webhook
   * Meta webhook endpoint (public)
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ) {
    // Verify signature (skip in development if not provided)
    if (signature && process.env.NODE_ENV === 'production') {
      const isValid = this.whatsappService.verifyWebhookSignature(
        signature,
        JSON.stringify(body),
      );

      if (!isValid) {
        return { error: 'Invalid signature' };
      }
    }

    // Process webhook
    await this.whatsappService.handleWebhookEvent(body);

    return { success: true };
  }

  /**
   * GET /api/whatsapp/webhook
   * Meta webhook verification (public) - LEGACY GLOBAL ENDPOINT
   * 
   * @deprecated Use workspace-specific endpoint: GET /api/whatsapp/webhook/:workspaceId
   * This global endpoint will be removed in a future version.
   */
  @Public()
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.warn('Using deprecated global webhook endpoint. Please migrate to workspace-specific endpoints.');
      return res.status(HttpStatus.OK).send(challenge);
    }

    return res.status(HttpStatus.FORBIDDEN).json({ error: 'Verification failed' });
  }

  /**
   * GET /api/whatsapp/webhook/:workspaceId
   * Meta webhook verification - PER-TENANT ENDPOINT (Recommended)
   * 
   * Each workspace gets a unique webhook URL and verify token for better security isolation.
   * URL format: https://your-domain.com/api/whatsapp/webhook/:workspaceId
   */
  @Public()
  @Get('webhook/:workspaceId')
  async verifyWebhookPerTenant(
    @Param('workspaceId') workspaceId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    try {
      // Find workspace's WhatsApp integration
      const integration = await this.prisma.whatsAppIntegration.findFirst({
        where: { 
          workspaceId,
          isActive: true,
        },
      });

      if (!integration) {
        this.logger.warn(`Webhook verification failed: No active integration for workspace ${workspaceId}`);
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Workspace not found or integration not active' });
      }

      // Verify token matches workspace's token
      if (mode === 'subscribe' && token === integration.webhookVerifyToken) {
        this.logger.log(`Webhook verified successfully for workspace: ${workspaceId}`);
        return res.status(HttpStatus.OK).send(challenge);
      }

      this.logger.warn(`Webhook verification failed for workspace ${workspaceId}: Invalid token`);
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Verification failed' });
    } catch (error) {
      this.logger.error(`Error verifying webhook for workspace ${workspaceId}:`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Verification error' });
    }
  }

  /**
   * POST /api/whatsapp/webhook/:workspaceId
   * Meta webhook handler - PER-TENANT ENDPOINT (Recommended)
   * 
   * Receives webhook events for a specific workspace.
   */
  @Public()
  @Post('webhook/:workspaceId')
  async handleWebhookPerTenant(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ) {
    try {
      // Verify the workspace has an active integration
      const integration = await this.prisma.whatsAppIntegration.findFirst({
        where: { 
          workspaceId,
          isActive: true,
        },
      });

      if (!integration) {
        this.logger.warn(`Webhook event rejected: No active integration for workspace ${workspaceId}`);
        return { error: 'Workspace not found or integration not active' };
      }

      // Verify signature (optional in development, required in production)
      if (signature && process.env.NODE_ENV === 'production') {
        const isValid = this.whatsappService.verifyWebhookSignature(
          signature,
          JSON.stringify(body),
        );

        if (!isValid) {
          this.logger.warn(`Invalid webhook signature for workspace ${workspaceId}`);
          return { error: 'Invalid signature' };
        }
      }

      // Process webhook event
      this.logger.log(`Processing webhook event for workspace: ${workspaceId}`);
      await this.whatsappService.handleWebhookEvent(body);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling webhook for workspace ${workspaceId}:`, error);
      return { error: 'Webhook processing failed' };
    }
  }
}
