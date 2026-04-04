import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  BadRequestException,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ShopifyOAuthService } from './shopify-oauth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('shopify/oauth')
export class ShopifyOAuthController {
  private readonly logger = new Logger(ShopifyOAuthController.name);

  constructor(private readonly oauthService: ShopifyOAuthService) {}

  /**
   * Step 1: Initiate OAuth flow
   * Frontend calls this to get Shopify install URL
   * 
   * GET /api/shopify/oauth/install?shop=mystore.myshopify.com
   */
  @Get('install')
  @UseGuards(JwtAuthGuard)
  async initiateInstall(
    @Query('shop') shop: string,
    @Request() req: any,
  ): Promise<{ installUrl: string }> {
    if (!shop) {
      throw new BadRequestException('Shop domain is required');
    }
    
    const workspaceId = req.user.workspaceId;
    
    this.logger.log(`Initiating OAuth install for shop: ${shop}, workspace: ${workspaceId}`);
    
    const installUrl = this.oauthService.generateInstallUrl(shop, workspaceId);
    
    return { installUrl };
  }

  /**
   * Step 2: OAuth callback from Shopify
   * Shopify redirects here after merchant approves
   * 
   * GET /api/shopify/oauth/callback?code=...&shop=...&state=...&hmac=...
   */
  @Public()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('state') state: string,
    @Query('hmac') hmac: string,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`OAuth callback received for shop: ${shop}`);

    // 1. Validate required parameters
    if (!code || !shop || !state || !hmac) {
      this.logger.error('Missing required OAuth callback parameters');
      return this.redirectWithError(res, 'Missing required parameters');
    }

    // 2. Validate HMAC signature
    if (!this.oauthService.validateHmac(query)) {
      this.logger.error('HMAC validation failed for OAuth callback');
      return this.redirectWithError(res, 'Invalid signature');
    }
    
    try {
      // 3. Decode state to get workspaceId
      const { workspaceId } = this.oauthService.decodeState(state);
      
      // 4. Exchange code for access token
      await this.oauthService.exchangeToken(shop, code, workspaceId);
      
      // 5. Redirect merchant back to settings page with success message
      const frontendUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3004';
      const redirectUrl = `${frontendUrl}/dashboard/settings?shopify=connected&shop=${encodeURIComponent(shop)}`;
      
      this.logger.log(`OAuth flow completed successfully for shop: ${shop}, redirecting to: ${redirectUrl}`);
      
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`, error.stack);
      return this.redirectWithError(res, error.message);
    }
  }

  /**
   * Step 3: Verify OAuth connection status
   * Frontend polls this after OAuth redirect
   * 
   * GET /api/shopify/oauth/status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getOAuthStatus(@Request() req: any): Promise<{
    connected: boolean;
    shop?: string;
    installedAt?: Date;
    scopes?: string[];
  }> {
    const workspaceId = req.user.workspaceId;
    
    const store = await this.oauthService.getOAuthStore(workspaceId);
    
    if (!store) {
      return { connected: false };
    }
    
    return {
      connected: true,
      shop: store.shopDomain,
      installedAt: store.oauthInstalledAt || undefined,
      scopes: store.scopes ? store.scopes.split(',') : [],
    };
  }

  /**
   * Step 4: Disconnect OAuth
   * 
   * DELETE /api/shopify/oauth/disconnect
   */
  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnectOAuth(@Request() req: any): Promise<{ message: string }> {
    const workspaceId = req.user.workspaceId;
    
    this.logger.log(`Disconnecting OAuth for workspace: ${workspaceId}`);
    
    await this.oauthService.disconnectOAuth(workspaceId);
    
    return { message: 'Shopify connection disconnected successfully' };
  }

  /**
   * Helper: Redirect to frontend with error
   */
  private redirectWithError(res: Response, error: string): void {
    const frontendUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3004';
    const redirectUrl = `${frontendUrl}/dashboard/settings?shopify=error&error=${encodeURIComponent(error)}`;
    res.redirect(redirectUrl);
  }
}
