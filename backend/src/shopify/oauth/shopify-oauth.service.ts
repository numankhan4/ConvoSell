import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyOAuthService {
  private readonly logger = new Logger(ShopifyOAuthService.name);
  
  private readonly clientId = process.env.SHOPIFY_OAUTH_CLIENT_ID;
  private readonly clientSecret = process.env.SHOPIFY_OAUTH_CLIENT_SECRET;
  private readonly redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  private readonly scopes = process.env.SHOPIFY_OAUTH_SCOPES;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    if (!this.clientId || !this.clientSecret || !this.redirectUri || !this.scopes) {
      this.logger.warn('Shopify OAuth credentials not configured. OAuth flow will not work.');
    }
  }

  /**
   * Generate OAuth installation URL with HMAC validation
   * Per Shopify docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
   */
  generateInstallUrl(shopDomain: string, workspaceId: string): string {
    // Normalize shop domain
    const shop = this.normalizeShopDomain(shopDomain);
    
    // Generate state parameter for CSRF protection
    const state = this.generateState(workspaceId);
    
    if (!this.clientId || !this.scopes || !this.redirectUri) {
      throw new BadRequestException('OAuth credentials not configured');
    }
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state,
      // Optional: grant_options: JSON.stringify(['per-user']), // Enable online access tokens
    });
    
    const installUrl = `https://${shop}/admin/oauth/authorize?${params.toString()}`;
    
    this.logger.log(`Generated OAuth install URL for shop: ${shop}, workspace: ${workspaceId}`);
    
    return installUrl;
  }

  /**
   * Exchange authorization code for permanent access token
   * Per Shopify docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#step-3-get-an-access-token
   */
  async exchangeToken(
    shop: string,
    code: string,
    workspaceId: string,
  ): Promise<{ accessToken: string; scope: string }> {
    const normalizedShop = this.normalizeShopDomain(shop);
    
    this.logger.log(`Exchanging authorization code for shop: ${normalizedShop}`);
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://${normalizedShop}/admin/oauth/access_token`,
          {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
          },
        ),
      );
      
      const { access_token, scope } = response.data;
      
      if (!access_token) {
        throw new Error('No access token received from Shopify');
      }
      
      this.logger.log(`Successfully exchanged token for shop: ${normalizedShop}, scopes: ${scope}`);
      
      // Store token in database
      await this.storeOAuthToken(normalizedShop, access_token, scope, workspaceId);
      
      return { accessToken: access_token, scope };
    } catch (error) {
      this.logger.error(
        `Token exchange failed for shop ${normalizedShop}: ${error.response?.data?.error || error.message}`,
      );
      throw new BadRequestException(
        `Failed to exchange authorization code: ${error.response?.data?.error || 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate HMAC signature from Shopify callback
   * Per Shopify docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#step-2-verify-the-installation-request
   */
  validateHmac(query: Record<string, any>): boolean {
    const { hmac, ...rest } = query;
    
    if (!hmac) {
      this.logger.warn('HMAC signature missing from callback');
      return false;
    }
    
    // Sort parameters alphabetically
    const sortedParams = Object.keys(rest)
      .sort()
      .map(key => `${key}=${rest[key]}`)
      .join('&');
    
    if (!this.clientSecret) {
      throw new BadRequestException('OAuth client secret not configured');
    }
    
    // Generate HMAC using SHA256
    const hash = crypto
      .createHmac('sha256', this.clientSecret)
      .update(sortedParams)
      .digest('hex');
    
    const isValid = hash === hmac;
    
    if (!isValid) {
      this.logger.warn(
        `HMAC validation failed. Expected: ${hash}, Received: ${hmac}`,
      );
    }
    
    return isValid;
  }

  /**
   * Store OAuth token in database (upsert)
   */
  private async storeOAuthToken(
    shopDomain: string,
    accessToken: string,
    scopes: string,
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(`Storing OAuth token for shop: ${shopDomain}, workspace: ${workspaceId}`);
    
    await this.prisma.shopifyStore.upsert({
      where: { shopDomain },
      update: {
        oauthAccessToken: accessToken,
        tokenType: 'oauth',
        scopes,
        oauthInstalledAt: new Date(),
        uninstalledAt: null,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        shopDomain,
        workspaceId,
        oauthAccessToken: accessToken,
        tokenType: 'oauth',
        scopes,
        oauthInstalledAt: new Date(),
        isActive: true,
      },
    });
    
    this.logger.log(`OAuth token stored successfully for shop: ${shopDomain}`);
  }

  /**
   * Get OAuth store for workspace
   */
  async getOAuthStore(workspaceId: string) {
    return this.prisma.shopifyStore.findFirst({
      where: { 
        workspaceId, 
        tokenType: 'oauth', 
        isActive: true,
        uninstalledAt: null,
      },
      select: {
        id: true,
        shopDomain: true,
        oauthInstalledAt: true,
        scopes: true,
        isActive: true,
        lastSyncAt: true,
      },
    });
  }

  /**
   * Disconnect OAuth (mark as uninstalled)
   */
  async disconnectOAuth(workspaceId: string): Promise<void> {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId, tokenType: 'oauth', isActive: true },
    });
    
    if (!store) {
      throw new NotFoundException('No OAuth connection found');
    }
    
    await this.prisma.shopifyStore.update({
      where: { id: store.id },
      data: {
        isActive: false,
        uninstalledAt: new Date(),
      },
    });
    
    this.logger.log(`OAuth connection disconnected for workspace: ${workspaceId}`);
  }

  /**
   * Normalize shop domain to <store>.myshopify.com format
   */
  private normalizeShopDomain(shop: string): string {
    // Remove protocol if present
    let normalized = shop.replace(/^https?:\/\//, '');
    
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    
    // Add .myshopify.com if missing
    if (!normalized.endsWith('.myshopify.com')) {
      // If it's just the store name, add myshopify.com
      if (!normalized.includes('.')) {
        normalized = `${normalized}.myshopify.com`;
      }
    }
    
    return normalized;
  }

  /**
   * Generate cryptographically secure state parameter
   * Encodes workspaceId for retrieval after callback
   */
  private generateState(workspaceId: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const payload = JSON.stringify({ workspaceId, nonce, timestamp });
    return Buffer.from(payload).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): { workspaceId: string; nonce: string; timestamp: number } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const payload = JSON.parse(decoded);
      
      // Validate state is not too old (max 10 minutes)
      const age = Date.now() - payload.timestamp;
      if (age > 10 * 60 * 1000) {
        throw new Error('State parameter expired');
      }
      
      return payload;
    } catch (error) {
      this.logger.error(`Failed to decode state parameter: ${error.message}`);
      throw new BadRequestException('Invalid or expired state parameter');
    }
  }
}
