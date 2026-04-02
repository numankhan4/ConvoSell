import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWhatsAppIntegrationDto, UpdateWhatsAppIntegrationDto } from './dto/whatsapp-integration.dto';
import { CreateShopifyStoreDto, UpdateShopifyStoreDto } from './dto/shopify-store.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ============================================================
  // WHATSAPP INTEGRATION
  // ============================================================

  async getWhatsAppIntegration(workspaceId: string) {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: { workspaceId },
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
    // Check if integration already exists
    const existing = await this.prisma.whatsAppIntegration.findFirst({
      where: { workspaceId },
    });

    if (existing) {
      throw new ConflictException('WhatsApp integration already exists for this workspace');
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

    const integration = await this.prisma.whatsAppIntegration.create({
      data: {
        workspaceId,
        phoneNumberId: dto.phoneNumberId,
        phoneNumber: dto.phoneNumber,
        businessAccountId: dto.businessAccountId,
        accessToken: dto.accessToken, // TODO: Encrypt in production
        refreshToken: dto.refreshToken,
        webhookVerifyToken: dto.webhookVerifyToken || 'not-used-see-env', // Webhook verification uses env variable
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
        const axios = require('axios');
        await axios.get(`${this.config.get('API_URL')}/api/health/workspace`, {
          headers: { 'x-workspace-id': workspaceId },
        });
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
      ...(dto.accessToken && { accessToken: dto.accessToken }),
      ...(dto.refreshToken !== undefined && { refreshToken: dto.refreshToken }),
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
          const axios = require('axios');
          await axios.get(`${this.config.get('API_URL')}/api/health/workspace`, {
            headers: { 'x-workspace-id': workspaceId },
          });
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
      this.logger.error(`Shopify credential exchange failed: ${error.message}`);
      throw new Error('Failed to authenticate with Shopify. Please check your Client ID and Client Secret.');
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getShopifyAccessToken(workspaceId: string): Promise<string> {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId },
    });

    if (!store) {
      throw new NotFoundException('Shopify store not found');
    }

    // Check if token needs refresh (expired, missing, or expiring in < 1 hour)
    const needsRefresh = !store.accessToken || 
                         !store.tokenExpiresAt || 
                         new Date(store.tokenExpiresAt).getTime() < Date.now() + 3600000;

    if (needsRefresh) {
      this.logger.log(`Refreshing Shopify token for workspace ${workspaceId}`);
      
      const { accessToken, expiresAt } = await this.exchangeShopifyCredentials(
        store.shopDomain,
        store.clientId,
        store.clientSecret,
      );

      // Update token in database
      await this.prisma.shopifyStore.update({
        where: { id: store.id },
        data: {
          accessToken,
          tokenExpiresAt: expiresAt,
        },
      });

      return accessToken;
    }

    return store.accessToken as string;
  }

  async getShopifyStore(workspaceId: string) {
    const store = await this.prisma.shopifyStore.findFirst({
      where: { workspaceId },
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
        // Exclude sensitive fields
        clientSecret: false,
        accessToken: false,
      },
    });

    return store;
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
        clientSecret: dto.clientSecret, // TODO: Encrypt in production
        accessToken,
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
      this.logger.warn(`Failed to auto-register webhooks: ${error.message}`);
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

    const token = accessToken || await this.getShopifyAccessToken(workspaceId);
    const domain = shopDomain || store.shopDomain;

    // Get webhook base URL from environment or use ngrok
    const webhookBaseUrl = this.config.get('SHOPIFY_WEBHOOK_URL') || this.config.get('APP_URL') || 'http://localhost:3000';

    // List of webhooks to register
    // Note: Shopify sends all webhook topics to the same URL, topic is in the x-shopify-topic header
    const webhooks = [
      {
        topic: 'ORDERS_CREATE',
        callbackUrl: `${webhookBaseUrl}/api/shopify/webhook`,
      },
      {
        topic: 'ORDERS_UPDATED',
        callbackUrl: `${webhookBaseUrl}/api/shopify/webhook`,
      },
      {
        topic: 'ORDERS_CANCELLED',
        callbackUrl: `${webhookBaseUrl}/api/shopify/webhook`,
      },
    ];

    const results: Array<{
      topic: string;
      success: boolean;
      id?: string;
      errors?: any[];
      error?: string;
    }> = [];

    for (const webhook of webhooks) {
      try {
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
              topic: webhook.topic,
              webhookSubscription: {
                callbackUrl: webhook.callbackUrl,
                format: 'JSON',
              },
            },
          }),
        });

        const data = await response.json();

        if (data.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
          this.logger.error(`Webhook registration error for ${webhook.topic}:`, data.data.webhookSubscriptionCreate.userErrors);
          results.push({ topic: webhook.topic, success: false, errors: data.data.webhookSubscriptionCreate.userErrors });
        } else {
          this.logger.log(`Webhook registered: ${webhook.topic} → ${webhook.callbackUrl}`);
          results.push({ topic: webhook.topic, success: true, id: data.data?.webhookSubscriptionCreate?.webhookSubscription?.id });
        }
      } catch (error) {
        this.logger.error(`Failed to register webhook ${webhook.topic}: ${error.message}`);
        results.push({ topic: webhook.topic, success: false, error: error.message });
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
      const { accessToken, expiresAt } = await this.exchangeShopifyCredentials(
        dto.shopDomain || store.shopDomain,
        dto.clientId || store.clientId,
        dto.clientSecret || store.clientSecret,
      );
      tokenData = { accessToken, expiresAt };
    }

    const updated = await this.prisma.shopifyStore.update({
      where: { id: storeId },
      data: {
        ...(dto.shopDomain && { shopDomain: dto.shopDomain }),
        ...(dto.clientId && { clientId: dto.clientId }),
        ...(dto.clientSecret && { clientSecret: dto.clientSecret }),
        ...(tokenData.accessToken && { accessToken: tokenData.accessToken }),
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
}
