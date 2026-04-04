import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../common/prisma/prisma.service';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { CreateWhatsAppIntegrationDto, UpdateWhatsAppIntegrationDto } from './dto/whatsapp-integration.dto';
import { CreateShopifyStoreDto, UpdateShopifyStoreDto } from './dto/shopify-store.dto';
import { firstValueFrom } from 'rxjs';
import { generateWebhookVerifyToken } from '../common/utils/crypto.util';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private httpService: HttpService,
    private whatsappTokenService: WhatsAppTokenService,
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

    // Generate unique webhook verify token for this workspace
    const webhookVerifyToken = generateWebhookVerifyToken();

    const integration = await this.prisma.whatsAppIntegration.create({
      data: {
        workspaceId,
        phoneNumberId: dto.phoneNumberId,
        phoneNumber: dto.phoneNumber,
        businessAccountId: dto.businessAccountId,
        accessToken: dto.accessToken, // TODO: Encrypt in production
        refreshToken: dto.refreshToken,
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
      return store.oauthAccessToken;
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
      where: { workspaceId, isActive: true },
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
      where: { workspaceId, isActive: true },
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
      const clientId = dto.clientId || store.clientId;
      const clientSecret = dto.clientSecret || store.clientSecret;
      
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
        callbackUrls: {
          orderCreated: `${apiUrl}/api/webhooks/shopify/orders/create`,
          orderUpdated: `${apiUrl}/api/webhooks/shopify/orders/update`,
          orderCancelled: `${apiUrl}/api/webhooks/shopify/orders/cancelled`,
        },
        setupInstructions: [
          '1. In Shopify Admin, go to Settings → Notifications',
          '2. Scroll to "Webhooks" section',
          '3. Click "Create webhook" for each event',
          '4. Select JSON format',
          '5. Paste the corresponding Callback URL',
          '6. Click "Save webhook"',
        ],
        note: 'Or use the "Register Webhooks" button to auto-configure (requires valid Shopify connection)',
      },
    };
  }
}
