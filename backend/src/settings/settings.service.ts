import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../common/prisma/prisma.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { CreateWhatsAppIntegrationDto, UpdateWhatsAppIntegrationDto } from './dto/whatsapp-integration.dto';
import { CreateShopifyStoreDto, UpdateShopifyStoreDto } from './dto/shopify-store.dto';
import { firstValueFrom } from 'rxjs';
import { decryptSecret, encryptSecret, generateWebhookVerifyToken } from '../common/utils/crypto.util';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private static readonly DEFAULT_CURRENCY = 'PKR';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private httpService: HttpService,
    private whatsappTokenService: WhatsAppTokenService,
  ) {}

  private normalizeCurrencyCode(currency?: string | null): string | null {
    if (!currency) return null;
    const normalized = String(currency).trim().toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
  }

  async getWorkspaceCurrency(workspaceId: string) {
    const activeStore = await this.prisma.shopifyStore.findFirst({
      where: {
        workspaceId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        shopDomain: true,
      },
    });

    if (!activeStore) {
      return {
        currency: SettingsService.DEFAULT_CURRENCY,
        supportedCurrencies: [SettingsService.DEFAULT_CURRENCY],
        source: 'fallback',
        shopDomain: null,
      };
    }

    const recentOrderCurrencies = await this.prisma.order.findMany({
      where: {
        workspaceId,
        shopifyStoreId: activeStore.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { currency: true },
    });

    const normalizedCurrencies = recentOrderCurrencies
      .map((order) => this.normalizeCurrencyCode(order.currency))
      .filter((value): value is string => Boolean(value));

    const currency = normalizedCurrencies[0] || SettingsService.DEFAULT_CURRENCY;
    const supportedCurrencies = Array.from(new Set(normalizedCurrencies));

    return {
      currency,
      supportedCurrencies: supportedCurrencies.length
        ? supportedCurrencies
        : [SettingsService.DEFAULT_CURRENCY],
      source: normalizedCurrencies.length ? 'orders' : 'fallback',
      shopDomain: activeStore.shopDomain,
    };
  }

  // ============================================================
  // ORDER VERIFICATION POLICY
  // ============================================================

  async getOrderVerificationSettings(workspaceId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id,
              "verificationEnabled",
              "verificationScope",
              "verificationFirstFollowupMinutes",
              "verificationFinalTimeoutMinutes",
              "verificationMaxFollowups",
              "verificationReadAwareEscalation"
       FROM workspaces
       WHERE id = $1
       LIMIT 1`,
      workspaceId,
    );

    if (!rows[0]) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      enabled: rows[0].verificationEnabled,
      scope: rows[0].verificationScope,
      firstFollowupMinutes: rows[0].verificationFirstFollowupMinutes,
      finalTimeoutMinutes: rows[0].verificationFinalTimeoutMinutes,
      maxFollowups: rows[0].verificationMaxFollowups,
      readAwareEscalation: rows[0].verificationReadAwareEscalation,
    };
  }

  async updateOrderVerificationSettings(
    workspaceId: string,
    dto: {
      enabled?: boolean;
      scope?: 'cod_only' | 'all_orders';
      firstFollowupMinutes?: number;
      finalTimeoutMinutes?: number;
      maxFollowups?: number;
      readAwareEscalation?: boolean;
    },
  ) {
    if (dto.scope && !['cod_only', 'all_orders'].includes(dto.scope)) {
      throw new BadRequestException('scope must be either cod_only or all_orders');
    }

    if (dto.firstFollowupMinutes !== undefined && (dto.firstFollowupMinutes < 15 || dto.firstFollowupMinutes > 1440)) {
      throw new BadRequestException('firstFollowupMinutes must be between 15 and 1440');
    }

    if (dto.finalTimeoutMinutes !== undefined && (dto.finalTimeoutMinutes < 60 || dto.finalTimeoutMinutes > 10080)) {
      throw new BadRequestException('finalTimeoutMinutes must be between 60 and 10080');
    }

    if (dto.maxFollowups !== undefined && (dto.maxFollowups < 0 || dto.maxFollowups > 2)) {
      throw new BadRequestException('maxFollowups must be between 0 and 2');
    }

    if (
      dto.firstFollowupMinutes !== undefined &&
      dto.finalTimeoutMinutes !== undefined &&
      dto.firstFollowupMinutes >= dto.finalTimeoutMinutes
    ) {
      throw new BadRequestException('firstFollowupMinutes must be lower than finalTimeoutMinutes');
    }

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE workspaces
       SET "verificationEnabled" = COALESCE($2, "verificationEnabled"),
           "verificationScope" = COALESCE($3, "verificationScope"),
           "verificationFirstFollowupMinutes" = COALESCE($4, "verificationFirstFollowupMinutes"),
           "verificationFinalTimeoutMinutes" = COALESCE($5, "verificationFinalTimeoutMinutes"),
           "verificationMaxFollowups" = COALESCE($6, "verificationMaxFollowups"),
           "verificationReadAwareEscalation" = COALESCE($7, "verificationReadAwareEscalation"),
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id,
                 "verificationEnabled",
                 "verificationScope",
                 "verificationFirstFollowupMinutes",
                 "verificationFinalTimeoutMinutes",
                 "verificationMaxFollowups",
                 "verificationReadAwareEscalation"`,
      workspaceId,
      dto.enabled ?? null,
      dto.scope ?? null,
      dto.firstFollowupMinutes ?? null,
      dto.finalTimeoutMinutes ?? null,
      dto.maxFollowups ?? null,
      dto.readAwareEscalation ?? null,
    );

    if (!rows[0]) {
      throw new NotFoundException('Workspace not found');
    }

    if (rows[0].verificationFirstFollowupMinutes >= rows[0].verificationFinalTimeoutMinutes) {
      throw new BadRequestException('firstFollowupMinutes must be lower than finalTimeoutMinutes');
    }

    return {
      enabled: rows[0].verificationEnabled,
      scope: rows[0].verificationScope,
      firstFollowupMinutes: rows[0].verificationFirstFollowupMinutes,
      finalTimeoutMinutes: rows[0].verificationFinalTimeoutMinutes,
      maxFollowups: rows[0].verificationMaxFollowups,
      readAwareEscalation: rows[0].verificationReadAwareEscalation,
    };
  }

  // ============================================================
  // WHATSAPP INTEGRATION
  // ============================================================

  async getWhatsAppIntegration(workspaceId: string) {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: { 
        workspaceId,
        deletedAt: null, // Exclude disconnected integrations
      },
      select: {
        id: true,
        phoneNumberId: true,
        phoneNumber: true,
        businessAccountId: true,
        tokenType: true,
        tokenExpiresAt: true,
        healthStatus: true,
        healthError: true,
        lastHealthCheck: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields from response
        accessToken: false,
        refreshToken: false,
        webhookVerifyToken: false,
      },
    });

    return integration;
  }

  async createWhatsAppIntegration(workspaceId: string, dto: CreateWhatsAppIntegrationDto) {
    // Check if ACTIVE integration already exists (excluding soft-deleted ones)
    const existing = await this.prisma.whatsAppIntegration.findFirst({
      where: { 
        workspaceId,
        deletedAt: null, // Only check for active integrations
      },
    });

    if (existing) {
      throw new ConflictException('WhatsApp integration already exists for this workspace');
    }

    // Check if there are any disconnected integrations
    const disconnected = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        workspaceId,
        deletedAt: { not: null }, // Check for soft-deleted integrations
      },
    });

    // If there's a disconnected integration, permanently delete it before creating new one
    if (disconnected) {
      this.logger.log(`Permanently deleting disconnected integration ${disconnected.id} for workspace ${workspaceId}`);
      await this.prisma.whatsAppIntegration.delete({
        where: { id: disconnected.id },
      });
    }

    // Check if phone number ID is already used by another workspace
    const duplicate = await this.prisma.whatsAppIntegration.findUnique({
      where: { phoneNumberId: dto.phoneNumberId },
    });

    if (duplicate) {
      throw new ConflictException('This phone number ID is already connected to another workspace');
    }

    // Calculate token expiry if not provided
    let tokenExpiresAt = dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null;
    const tokenType = dto.tokenType || 'temporary';
    
    if (!tokenExpiresAt && tokenType !== 'system-user') {
      // Default: 60 days for temporary/long-lived tokens
      tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);
    }

    // Generate unique webhook verify token for this workspace
    const webhookVerifyToken = generateWebhookVerifyToken();

    const integration = await this.prisma.whatsAppIntegration.create({
      data: {
        workspaceId,
        phoneNumberId: dto.phoneNumberId,
        phoneNumber: dto.phoneNumber,
        businessAccountId: dto.businessAccountId,
        accessToken: encryptSecret(dto.accessToken) as string,
        refreshToken: encryptSecret(dto.refreshToken),
        webhookVerifyToken, // Unique per workspace
        tokenType,
        tokenExpiresAt,
        isActive: dto.isActive ?? true,
        healthStatus: 'unknown',
      },
      select: {
        id: true,
        phoneNumberId: true,
        phoneNumber: true,
        businessAccountId: true,
        webhookVerifyToken: true, // Return token to show in UI
        tokenType: true,
        tokenExpiresAt: true,
        healthStatus: true,
        healthError: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`WhatsApp integration created for workspace ${workspaceId}`);
    
    // Trigger health check asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await this.whatsappTokenService.updateHealthStatus(integration.id);
        this.logger.log(`Health check triggered for integration ${integration.id}`);
      } catch (error) {
        this.logger.error('Failed to trigger health check', error);
      }
    });
    
    return integration;
  }

  async updateWhatsAppIntegration(
    workspaceId: string,
    integrationId: string,
    dto: UpdateWhatsAppIntegrationDto,
  ) {
    // Verify integration belongs to workspace
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      throw new NotFoundException('WhatsApp integration not found');
    }

    // If updating phone number ID, check for conflicts
    if (dto.phoneNumberId && dto.phoneNumberId !== integration.phoneNumberId) {
      const duplicate = await this.prisma.whatsAppIntegration.findUnique({
        where: { phoneNumberId: dto.phoneNumberId },
      });

      if (duplicate) {
        throw new ConflictException('This phone number ID is already connected to another workspace');
      }
    }

    // Calculate token expiry if access token is being updated
    const updateData: any = {
      ...(dto.phoneNumberId && { phoneNumberId: dto.phoneNumberId }),
      ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
      ...(dto.businessAccountId && { businessAccountId: dto.businessAccountId }),
      ...(dto.accessToken && { accessToken: encryptSecret(dto.accessToken) }),
      ...(dto.refreshToken !== undefined && { refreshToken: encryptSecret(dto.refreshToken) }),
      ...(dto.webhookVerifyToken && { webhookVerifyToken: dto.webhookVerifyToken }),
      ...(dto.tokenType && { tokenType: dto.tokenType }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    // If new access token provided, update expiry
    if (dto.accessToken) {
      if (dto.tokenExpiresAt) {
        updateData.tokenExpiresAt = new Date(dto.tokenExpiresAt);
      } else if (dto.tokenType !== 'system-user') {
        // Default: 60 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        updateData.tokenExpiresAt = expiresAt;
      } else {
        // System user tokens don't expire
        updateData.tokenExpiresAt = null;
      }
      
      // Reset health status when token is updated
      updateData.healthStatus = 'unknown';
      updateData.healthError = null;
    }

    const updated = await this.prisma.whatsAppIntegration.update({
      where: { id: integrationId },
      data: updateData,
      select: {
        id: true,
        phoneNumberId: true,
        phoneNumber: true,
        businessAccountId: true,
        tokenType: true,
        tokenExpiresAt: true,
        healthStatus: true,
        healthError: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`WhatsApp integration ${integrationId} updated`);
    
    // Trigger health check asynchronously if token was updated
    if (dto.accessToken) {
      setImmediate(async () => {
        try {
          await this.whatsappTokenService.updateHealthStatus(integrationId);
          this.logger.log(`Health check triggered for integration ${integrationId}`);
        } catch (error) {
          this.logger.error('Failed to trigger health check', error);
        }
      });
    }
    
    return updated;
  }

  async deleteWhatsAppIntegration(workspaceId: string, integrationId: string) {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      throw new NotFoundException('WhatsApp integration not found');
    }

    await this.prisma.whatsAppIntegration.delete({
      where: { id: integrationId },
    });

    this.logger.log(`WhatsApp integration ${integrationId} deleted`);
    return { message: 'WhatsApp integration deleted successfully' };
  }

  /**
   * Soft delete (disconnect) WhatsApp integration
   * Data kept for 30 days, can be restored
   */
  async disconnectWhatsAppIntegration(workspaceId: string, integrationId: string, userId: string) {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      throw new NotFoundException('WhatsApp integration not found');
    }

    if (integration.deletedAt) {
      throw new BadRequestException('Integration is already disconnected');
    }

    // Soft delete: mark as inactive and set deletedAt
    const updated = await this.prisma.whatsAppIntegration.update({
      where: { id: integrationId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Calculate grace period end date (30 days from now)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

    this.logger.log(`WhatsApp integration ${integrationId} disconnected by user ${userId}`);
    
    return {
      message: 'WhatsApp integration disconnected successfully',
      integration: {
        id: updated.id,
        phoneNumber: updated.phoneNumber,
        disconnectedAt: updated.deletedAt,
        gracePeriodEnds: gracePeriodEnd,
        canRestore: true,
      },
    };
  }

  /**
   * Restore disconnected WhatsApp integration
   */
  async restoreWhatsAppIntegration(workspaceId: string, integrationId: string) {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      throw new NotFoundException('WhatsApp integration not found');
    }

    if (!integration.deletedAt) {
      throw new BadRequestException('Integration is not disconnected');
    }

    // Check if grace period has expired (30 days)
    const daysSinceDeleted = Math.floor(
      (Date.now() - integration.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDeleted > 30) {
      throw new BadRequestException('Grace period expired. Integration data has been permanently deleted.');
    }

    // Restore: set back to active and clear deletedAt
    const restored = await this.prisma.whatsAppIntegration.update({
      where: { id: integrationId },
      data: {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      },
    });

    this.logger.log(`WhatsApp integration ${integrationId} restored`);
    
    return {
      message: 'WhatsApp integration restored successfully',
      integration: {
        id: restored.id,
        phoneNumber: restored.phoneNumber,
        restoredAt: new Date(),
      },
    };
  }

  // ============================================================
  // SHOPIFY INTEGRATION (2026 - Client Credentials)
  // ============================================================

  /**
   * Exchange client credentials for access token
   * Shopify 2026: https://shopify.dev/docs/apps/build/authentication-authorization/client-secrets
   */
  private async exchangeShopifyCredentials(shopDomain: string, clientId: string, clientSecret: string) {
    const url = `https://${shopDomain}/admin/oauth/access_token`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange credentials: ${error}`);
      }

      const data = await response.json();
      
      // Response format: { access_token, scope, expires_in: 86399 }
      // Token expires in 24 hours (86399 seconds)
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      
      return {
        accessToken: data.access_token,
        scopes: data.scope,
        expiresAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Shopify credential exchange failed: ${errorMessage}`);
      throw new Error('Failed to authenticate with Shopify. Please check your Client ID and Client Secret.');
    }
  }

  /**
   * Get valid access token (refresh if expired)
   * Supports both OAuth (permanent tokens) and Client Credentials (24-hour tokens)
   */
  async getShopifyAccessToken(workspaceId: string): Promise<string> {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    // PRIORITY 1: OAuth token (permanent, no refresh needed)
    if (store.tokenType === 'oauth' && store.oauthAccessToken && !store.uninstalledAt) {
      this.logger.log(`Using OAuth token for workspace ${workspaceId}`);
      return decryptSecret(store.oauthAccessToken) as string;
    }

    // PRIORITY 2: Client Credentials (legacy, 24-hour tokens)
    // Check if token needs refresh (expired, missing, or expiring in < 1 hour)
    const needsRefresh = !store.accessToken || 
                         !store.tokenExpiresAt || 
                         new Date(store.tokenExpiresAt).getTime() < Date.now() + 3600000;

    if (needsRefresh) {
      this.logger.log(`Refreshing Client Credentials token for workspace ${workspaceId}`);
      
      if (!store.clientId || !store.clientSecret) {
        throw new BadRequestException(
          'Shopify credentials missing. Please reconnect your store using OAuth.',
        );
      }
      
      const { accessToken, expiresAt } = await this.exchangeShopifyCredentials(
        store.shopDomain,
        store.clientId,
        decryptSecret(store.clientSecret) as string,
      );

      // Update token in database
      await this.prisma.shopifyStore.update({
        where: { id: store.id },
        data: {
          accessToken: encryptSecret(accessToken),
          tokenExpiresAt: expiresAt,
        },
      });

      return accessToken;
    }

    return decryptSecret(store.accessToken) as string;
  }

  async getShopifyStore(workspaceId: string) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { 
        workspaceId, 
        isActive: true,
        deletedAt: null, // Exclude disconnected stores
      },
      select: {
        id: true,
        shopDomain: true,
        clientId: true,
        tokenType: true,
        oauthInstalledAt: true,
        scopes: true,
        isActive: true,
        installedAt: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields
        clientSecret: false,
        accessToken: false,
        oauthAccessToken: false,
      },
    });

    return store;
  }

  /**
   * Get active Shopify store ID for workspace
   * Used for filtering orders/contacts by current store
   */
  async getActiveShopifyStoreId(workspaceId: string): Promise<string | null> {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { 
        workspaceId, 
        isActive: true,
        deletedAt: null, // Exclude disconnected stores
      },
      select: { id: true },
    });

    return store?.id || null;
  }

  async createShopifyStore(workspaceId: string, dto: CreateShopifyStoreDto) {
    // Check if store already exists
    const existing = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId },
    });

    if (existing) {
      throw new ConflictException('Shopify store already exists for this workspace');
    }

    // Check if shop domain is already used
    const duplicate = await this.prisma.shopifyStore.findUnique({
      where: { shopDomain: dto.shopDomain },
    });

    if (duplicate) {
      throw new ConflictException('This Shopify store is already connected to another workspace');
    }

    // Exchange credentials for access token
    this.logger.log(`Exchanging Shopify credentials for workspace ${workspaceId}`);
    const { accessToken, scopes, expiresAt } = await this.exchangeShopifyCredentials(
      dto.shopDomain,
      dto.clientId,
      dto.clientSecret,
    );

    const store = await this.prisma.shopifyStore.create({
      data: {
        workspaceId,
        shopDomain: dto.shopDomain,
        clientId: dto.clientId,
        clientSecret: encryptSecret(dto.clientSecret),
        accessToken: encryptSecret(accessToken),
        tokenExpiresAt: expiresAt,
        scopes: scopes || dto.scopes, // Use returned scopes or provided ones
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        shopDomain: true,
        clientId: true,
        scopes: true,
        isActive: true,
        installedAt: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Shopify store connected for workspace ${workspaceId}`);

    // Auto-register webhooks
    try {
      await this.registerShopifyWebhooks(workspaceId, accessToken, dto.shopDomain);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to auto-register webhooks: ${errorMessage}`);
      // Don't fail the store creation if webhook registration fails
    }

    return store;
  }

  /**
   * Register Shopify webhooks using GraphQL Admin API
   * Docs: https://shopify.dev/docs/apps/build/webhooks/subscribe/subscribe-using-api
   */
  async registerShopifyWebhooks(workspaceId: string, accessToken?: string, shopDomain?: string) {
    // Get store and token
    const store = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    const token =
      accessToken ||
      (store.oauthAccessToken ? decryptSecret(store.oauthAccessToken) : null) ||
      (store.accessToken ? decryptSecret(store.accessToken) : null) ||
      await this.getShopifyAccessToken(workspaceId);
    const domain = shopDomain || store.shopDomain;

    // Get webhook base URL from environment or use ngrok
    const webhookBaseUrl = this.config.get('SHOPIFY_WEBHOOK_URL') || this.config.get('APP_URL') || 'http://localhost:3000';

    // Required order webhooks for CRM sync + fulfillment progression.
    const requiredTopics = [
      'ORDERS_CREATE',
      'ORDERS_UPDATED',
      'ORDERS_CANCELLED',
      'ORDERS_DELETE',
      'ORDERS_FULFILLED',
    ];
    const callbackUrl = `${webhookBaseUrl}/api/shopify/webhook`;

    const results: Array<{
      topic: string;
      success: boolean;
      id?: string;
      action?: 'already_configured' | 'repaired' | 'created' | 'deleted_old';
      errors?: any[];
      error?: string;
    }> = [];

    // Fetch existing webhook subscriptions first so this function can self-heal.
    const existingResponse = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query: `
          query webhookSubscriptions {
            webhookSubscriptions(first: 100) {
              edges {
                node {
                  id
                  topic
                  endpoint {
                    __typename
                    ... on WebhookHttpEndpoint {
                      callbackUrl
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    });

    const existingData = await existingResponse.json();
    const existingWebhooks = existingData?.data?.webhookSubscriptions?.edges?.map((edge: any) => edge.node) || [];

    if (existingData?.errors?.length) {
      this.logger.error('Failed to fetch existing webhook subscriptions', existingData.errors);
      throw new BadRequestException('Unable to fetch Shopify webhook subscriptions');
    }

    const byTopic = new Map<string, any[]>();
    for (const webhook of existingWebhooks) {
      if (!requiredTopics.includes(webhook.topic)) continue;
      const current = byTopic.get(webhook.topic) || [];
      current.push(webhook);
      byTopic.set(webhook.topic, current);
    }

    for (const topic of requiredTopics) {
      try {
        const existingForTopic = byTopic.get(topic) || [];
        const matching = existingForTopic.find((sub: any) => sub.endpoint?.callbackUrl === callbackUrl);

        if (matching) {
          // If duplicate valid subscriptions exist for same topic, keep one and remove extras.
          const duplicates = existingForTopic.filter((sub: any) => sub.id !== matching.id && sub.endpoint?.callbackUrl === callbackUrl);
          for (const duplicate of duplicates) {
            const deleteResponse = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token,
              },
              body: JSON.stringify({
                query: `
                  mutation webhookSubscriptionDelete($id: ID!) {
                    webhookSubscriptionDelete(id: $id) {
                      deletedWebhookSubscriptionId
                      userErrors {
                        field
                        message
                      }
                    }
                  }
                `,
                variables: { id: duplicate.id },
              }),
            });

            const deleteData = await deleteResponse.json();
            const deleteErrors = deleteData?.data?.webhookSubscriptionDelete?.userErrors || [];
            if (deleteErrors.length === 0) {
              results.push({ topic, success: true, id: duplicate.id, action: 'deleted_old' });
            }
          }

          this.logger.log(`Webhook already configured: ${topic} → ${callbackUrl}`);
          results.push({ topic, success: true, id: matching.id, action: 'already_configured' });
          continue;
        }

        // Remove wrong-url subscriptions for same topic.
        for (const wrong of existingForTopic) {
          const deleteResponse = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': token,
            },
            body: JSON.stringify({
              query: `
                mutation webhookSubscriptionDelete($id: ID!) {
                  webhookSubscriptionDelete(id: $id) {
                    deletedWebhookSubscriptionId
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `,
              variables: { id: wrong.id },
            }),
          });

          const deleteData = await deleteResponse.json();
          const deleteErrors = deleteData?.data?.webhookSubscriptionDelete?.userErrors || [];

          if (deleteErrors.length > 0) {
            this.logger.warn(`Failed deleting old webhook ${topic} (${wrong.id})`, deleteErrors);
          } else {
            results.push({ topic, success: true, id: wrong.id, action: 'deleted_old' });
          }
        }

        const response = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
          },
          body: JSON.stringify({
            query: `
              mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
                webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
                  userErrors {
                    field
                    message
                  }
                  webhookSubscription {
                    id
                    topic
                    endpoint {
                      __typename
                      ... on WebhookHttpEndpoint {
                        callbackUrl
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              topic,
              webhookSubscription: {
                callbackUrl,
                format: 'JSON',
              },
            },
          }),
        });

        const data = await response.json();

        if (data.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
          this.logger.error(`Webhook registration error for ${topic}:`, data.data.webhookSubscriptionCreate.userErrors);
          results.push({ topic, success: false, errors: data.data.webhookSubscriptionCreate.userErrors });
        } else {
          const action = existingForTopic.length > 0 ? 'repaired' : 'created';
          this.logger.log(`Webhook ${action}: ${topic} → ${callbackUrl}`);
          results.push({ topic, success: true, id: data.data?.webhookSubscriptionCreate?.webhookSubscription?.id, action });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to ensure webhook ${topic}: ${errorMessage}`);
        results.push({ topic, success: false, error: errorMessage });
      }
    }

    return results;
  }

  async updateShopifyStore(workspaceId: string, storeId: string, dto: UpdateShopifyStoreDto) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: {
        id: storeId,
        workspaceId,
      },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    // If updating shop domain, check for conflicts
    if (dto.shopDomain && dto.shopDomain !== store.shopDomain) {
      const duplicate = await this.prisma.shopifyStore.findUnique({
        where: { shopDomain: dto.shopDomain },
      });

      if (duplicate) {
        throw new ConflictException('This Shopify store is already connected to another workspace');
      }
    }

    // If credentials changed, re-exchange for new token
    let tokenData: { accessToken?: string; expiresAt?: Date } = {};
    if (dto.clientId || dto.clientSecret) {
      const clientId = dto.clientId || store.clientId;
      const clientSecret = dto.clientSecret || (decryptSecret(store.clientSecret) as string);
      
      if (!clientId || !clientSecret) {
        throw new BadRequestException('Client ID and Secret are required');
      }
      
      const { accessToken, expiresAt } = await this.exchangeShopifyCredentials(
        dto.shopDomain || store.shopDomain,
        clientId,
        clientSecret,
      );
      tokenData = { accessToken, expiresAt };
    }

    const updated = await this.prisma.shopifyStore.update({
      where: { id: storeId },
      data: {
        ...(dto.shopDomain && { shopDomain: dto.shopDomain }),
        ...(dto.clientId && { clientId: dto.clientId }),
        ...(dto.clientSecret && { clientSecret: encryptSecret(dto.clientSecret) }),
        ...(tokenData.accessToken && { accessToken: encryptSecret(tokenData.accessToken) }),
        ...(tokenData.expiresAt && { tokenExpiresAt: tokenData.expiresAt }),
        ...(dto.scopes && { scopes: dto.scopes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        shopDomain: true,
        clientId: true,
        scopes: true,
        isActive: true,
        installedAt: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Shopify store ${storeId} updated`);
    return updated;
  }

  async deleteShopifyStore(workspaceId: string, storeId: string) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: {
        id: storeId,
        workspaceId,
      },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    await this.prisma.shopifyStore.delete({
      where: { id: storeId },
    });

    this.logger.log(`Shopify store ${storeId} deleted`);
    return { message: 'Shopify store deleted successfully' };
  }

  /**
   * Soft delete (disconnect) Shopify store
   * Data kept for 90 days (longer for business records), can be restored
   */
  async disconnectShopifyStore(workspaceId: string, storeId: string, userId: string) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: {
        id: storeId,
        workspaceId,
      },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    if (store.deletedAt) {
      throw new BadRequestException('Store is already disconnected');
    }

    // Soft delete: mark as inactive and set deletedAt
    const updated = await this.prisma.shopifyStore.update({
      where: { id: storeId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Calculate grace period end date (90 days from now)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    this.logger.log(`Shopify store ${storeId} disconnected by user ${userId}`);
    
    return {
      message: 'Shopify store disconnected successfully',
      store: {
        id: updated.id,
        shopDomain: updated.shopDomain,
        disconnectedAt: updated.deletedAt,
        gracePeriodEnds: gracePeriodEnd,
        canRestore: true,
      },
    };
  }

  /**
   * Restore disconnected Shopify store
   */
  async restoreShopifyStore(workspaceId: string, storeId: string) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: {
        id: storeId,
        workspaceId,
      },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    if (!store.deletedAt) {
      throw new BadRequestException('Store is not disconnected');
    }

    // Check if grace period has expired (90 days)
    const daysSinceDeleted = Math.floor(
      (Date.now() - store.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDeleted > 90) {
      throw new BadRequestException('Grace period expired. Store data has been permanently deleted.');
    }

    // Restore: set back to active and clear deletedAt
    const restored = await this.prisma.shopifyStore.update({
      where: { id: storeId },
      data: {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      },
    });

    this.logger.log(`Shopify store ${storeId} restored`);
    
    return {
      message: 'Shopify store restored successfully',
      store: {
        id: restored.id,
        shopDomain: restored.shopDomain,
        restoredAt: new Date(),
      },
    };
  }

  // ============================================================
  // CONNECTION TESTING
  // ============================================================

  /**
   * Test WhatsApp credentials by calling Meta Graph API
   */
  async testWhatsAppConnection(credentials: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  }) {
    try {
      // Test 1: Verify access token by calling /me endpoint
      const meResponse = await firstValueFrom(
        this.httpService.get('https://graph.facebook.com/v18.0/me', {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
          params: { fields: 'id,name' },
        })
      );

      if (!meResponse.data?.id) {
        throw new Error('Invalid access token - unable to verify identity');
      }

      // Test 2: Verify phone number ID is accessible
      const phoneResponse = await firstValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}`,
          {
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
            params: { fields: 'id,verified_name,display_phone_number,quality_rating' },
          }
        )
      );

      if (!phoneResponse.data?.id) {
        throw new Error('Phone Number ID not found or inaccessible');
      }

      // Test 3: Verify business account access
      const wabaResponse = await firstValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/v18.0/${credentials.businessAccountId}`,
          {
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
            params: { fields: 'id,name,message_template_namespace' },
          }
        )
      );

      if (!wabaResponse.data?.id) {
        throw new Error('Business Account ID not found or inaccessible');
      }

      this.logger.log('✅ WhatsApp connection test passed');
      
      return {
        success: true,
        message: 'All checks passed! Your WhatsApp connection is ready.',
        details: {
          tokenValid: true,
          phoneNumberAccessible: true,
          phoneNumber: phoneResponse.data.display_phone_number,
          verifiedName: phoneResponse.data.verified_name,
          qualityRating: phoneResponse.data.quality_rating,
          businessAccountAccessible: true,
          businessAccountName: wabaResponse.data.name,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ WhatsApp connection test failed: ${error.message}`);
      
      // Parse error for user-friendly message
      let userMessage = 'Connection test failed. Please check your credentials.';
      let errorCode = null;
      
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        errorCode = fbError.code;
        
        // Map common error codes to user-friendly messages
        switch (fbError.code) {
          case 190:
            userMessage = '❌ Access token expired or invalid. Please generate a new token from Meta Business Manager.';
            break;
          case 100:
            if (fbError.message.includes('phone number')) {
              userMessage = '❌ Phone Number ID not found. Please verify the ID from your WhatsApp API Setup panel.';
            } else if (fbError.message.includes('business')) {
              userMessage = '❌ Business Account ID not found. Please verify the ID from Meta Business Settings.';
            } else {
              userMessage = `❌ Invalid parameter: ${fbError.message}`;
            }
            break;
          case 10:
            userMessage = '❌ Permission denied. Your access token does not have the required permissions (whatsapp_business_messaging, whatsapp_business_management).';
            break;
          case 4:
            userMessage = '❌ Rate limit exceeded. Please wait a few minutes and try again.';
            break;
          default:
            userMessage = `❌ Meta API Error (${fbError.code}): ${fbError.message}`;
        }
      } else if (error.message) {
        userMessage = `❌ ${error.message}`;
      }
      
      return {
        success: false,
        message: userMessage,
        errorCode,
        details: {
          tokenValid: false,
          phoneNumberAccessible: false,
          businessAccountAccessible: false,
        },
      };
    }
  }

  /**
   * Test Shopify credentials by attempting token exchange
   */
  async testShopifyConnection(credentials: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
  }) {
    try {
      // Attempt to exchange credentials for access token
      const { accessToken, scopes } = await this.exchangeShopifyCredentials(
        credentials.shopDomain,
        credentials.clientId,
        credentials.clientSecret,
      );

      // If we got here, credentials are valid
      this.logger.log('✅ Shopify connection test passed');
      
      return {
        success: true,
        message: 'All checks passed! Your Shopify store is ready to connect.',
        details: {
          credentialsValid: true,
          shopDomain: credentials.shopDomain,
          scopes: scopes.split(','),
          tokenReceived: true,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Shopify connection test failed: ${error.message}`);
      
      let userMessage = 'Connection test failed. Please check your credentials.';
      
      if (error.message.includes('Failed to authenticate')) {
        userMessage = '❌ Invalid Client ID or Client Secret. Please verify your credentials from Shopify Partners portal.';
      } else if (error.message.includes('shop domain')) {
        userMessage = '❌ Invalid shop domain. Please use the format: yourstore.myshopify.com';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        userMessage = '❌ Shop domain not found. Please verify your store URL is correct.';
      } else {
        userMessage = `❌ ${error.message}`;
      }
      
      return {
        success: false,
        message: userMessage,
        details: {
          credentialsValid: false,
          tokenReceived: false,
        },
      };
    }
  }

  // ============================================================
  // WEBHOOK URLS
  // ============================================================

  /**
   * Get pre-formatted webhook URLs for easy copying
   */
  async getWebhookUrls(workspaceId: string) {
    const apiUrl = this.config.get('API_URL') || 'http://localhost:3000';
    
    // Get workspace-specific webhook verify token
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: { workspaceId },
      select: {
        webhookVerifyToken: true,
      },
    });

    const webhookVerifyToken = integration?.webhookVerifyToken || 'integration-not-configured';
    
    return {
      whatsapp: {
        // NEW: Workspace-specific webhook URL (recommended for multi-tenant)
        callbackUrl: `${apiUrl}/api/whatsapp/webhook/${workspaceId}`,
        verifyToken: webhookVerifyToken,
        
        // Legacy global endpoint (deprecated)
        legacyCallbackUrl: `${apiUrl}/api/whatsapp/webhook`,
        legacyVerifyToken: this.config.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'not-configured',
        
        setupInstructions: [
          '1. Go to Meta App Dashboard → WhatsApp → Configuration',
          '2. Click "Edit" in Webhook section',
          '3. Paste the Callback URL above (workspace-specific URL)',
          '4. Paste the Verify Token above (unique for your workspace)',
          '5. Subscribe to "messages" webhook field',
          '6. Click "Verify and Save"',
        ],
        securityNote: 'Each workspace has a unique webhook URL and token for better security isolation.',
      },
      shopify: {
        callbackUrl: `${apiUrl}/api/shopify/webhook`,
        setupInstructions: [
          '1. In Shopify Admin, go to Settings → Notifications',
          '2. Scroll to "Webhooks" section',
          '3. Click "Create webhook"',
          '4. Event: Order creation',
          '5. Format: JSON',
          '6. URL: Paste the Callback URL above',
          '7. Click "Save webhook"',
          '8. Repeat for Order updates, Order cancelled, and Order deleted events (use same URL)',
        ],
        note: 'The same webhook URL handles all order events. Shopify sends the event type in the x-shopify-topic header.',
        requiredWebhooks: [
          'orders/create - Required for new orders',
          'orders/updated - Required for order status changes',
          'orders/cancelled - Required for cancellation sync',
          'orders/delete - Required for deletion sync',
        ],
      },
    };
  }
}
