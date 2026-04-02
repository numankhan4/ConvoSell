import { Controller, Post, Get, Body, Query, Req, Headers, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../common/decorators/public.decorator';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

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
   * Meta webhook verification (public)
   * Returns plain text response as required by Meta
   * 
   * NOTE: This uses a GLOBAL verify token from environment variable (WHATSAPP_WEBHOOK_VERIFY_TOKEN).
   * For multi-tenant setups, consider implementing per-workspace verification with workspace ID in URL.
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
      // Return challenge as plain text (Meta requires this)
      return res.status(HttpStatus.OK).send(challenge);
    }

    return res.status(HttpStatus.FORBIDDEN).json({ error: 'Verification failed' });
  }
}
