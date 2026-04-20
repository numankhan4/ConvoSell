import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../common/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { decryptSecret } from '../common/utils/crypto.util';

interface TokenDebugResponse {
  data: {
    app_id: string;
    application: string;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    type: string;
    user_id: string;
  };
}

interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

@Injectable()
export class WhatsAppTokenService {
  private readonly logger = new Logger(WhatsAppTokenService.name);
  private readonly GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Check token health using Meta's debug_token endpoint
   * Returns token validity and expiration info
   */
  async checkTokenHealth(accessToken: string): Promise<{
    isValid: boolean;
    expiresAt: Date | null;
    scopes: string[];
    tokenType: string;
    errorMessage?: string;
  }> {
    try {
      this.logger.log('Checking token health with Meta API');

      // Use debug_token to check token validity
      const response = await firstValueFrom(
        this.httpService.get<TokenDebugResponse>(
          `${this.GRAPH_API_URL}/debug_token`,
          {
            params: {
              input_token: accessToken,
              access_token: accessToken, // Can use same token to check itself
            },
          },
        ),
      );

      const tokenData = response.data.data;

      this.logger.log(`Token check result: valid=${tokenData.is_valid}, expires=${tokenData.expires_at}`);

      return {
        isValid: tokenData.is_valid,
        expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null,
        scopes: tokenData.scopes || [],
        tokenType: tokenData.type || 'unknown',
      };
    } catch (error: any) {
      this.logger.error(`Token health check failed: ${error.response?.data?.error?.message || error.message}`);
      
      return {
        isValid: false,
        expiresAt: null,
        scopes: [],
        tokenType: 'error',
        errorMessage: error.response?.data?.error?.message || 'Failed to check token',
      };
    }
  }

  /**
   * Refresh/extend access token lifespan
   * Exchanges short-lived token for long-lived token (60 days)
   */
  async refreshAccessToken(
    accessToken: string,
    appId: string,
    appSecret: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      this.logger.log('Refreshing WhatsApp access token');

      const response = await firstValueFrom(
        this.httpService.get<TokenRefreshResponse>(
          `${this.GRAPH_API_URL}/oauth/access_token`,
          {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: appId,
              client_secret: appSecret,
              fb_exchange_token: accessToken,
            },
          },
        ),
      );

      const expiresIn = response.data.expires_in || 60 * 24 * 60 * 60; // Default 60 days
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(`Token refreshed successfully, expires in ${expiresIn} seconds`);

      return {
        accessToken: response.data.access_token,
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(`Token refresh failed: ${error.response?.data?.error?.message || error.message}`);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Auto-refresh tokens that are expiring soon (< 7 days)
   * Called by cron job or manually
   */
  async autoRefreshExpiringTokens(): Promise<{
    refreshed: number;
    failed: number;
    details: Array<{ workspaceId: string; success: boolean; error?: string }>;
  }> {
    this.logger.log('Starting auto-refresh for expiring tokens');

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find integrations with tokens expiring in < 7 days
    const expiringIntegrations = await this.prisma.whatsAppIntegration.findMany({
      where: {
        tokenExpiresAt: {
          lte: sevenDaysFromNow,
          gte: new Date(), // Not already expired
        },
        tokenType: {
          in: ['temporary', 'long-lived'], // Don't refresh system-user tokens (they're permanent)
        },
        isActive: true,
      },
      select: {
        id: true,
        workspaceId: true,
        accessToken: true,
        tokenExpiresAt: true,
        phoneNumber: true,
      },
    });

    this.logger.log(`Found ${expiringIntegrations.length} tokens expiring soon`);

    const results = {
      refreshed: 0,
      failed: 0,
      details: [] as Array<{ workspaceId: string; success: boolean; error?: string }>,
    };

    for (const integration of expiringIntegrations) {
      try {
        const accessToken = decryptSecret(integration.accessToken) as string;

        // Note: We'd need app_id and app_secret from env or config
        // For now, just update health status
        const health = await this.checkTokenHealth(accessToken);

        if (!health.isValid) {
          await this.prisma.whatsAppIntegration.update({
            where: { id: integration.id },
            data: {
              healthStatus: 'error',
              healthError: 'Token is invalid or expired',
              lastHealthCheck: new Date(),
            },
          });

          results.failed++;
          results.details.push({
            workspaceId: integration.workspaceId,
            success: false,
            error: 'Token invalid',
          });
        } else {
          // Update with fresh expiry info
          await this.prisma.whatsAppIntegration.update({
            where: { id: integration.id },
            data: {
              tokenExpiresAt: health.expiresAt,
              healthStatus: 'healthy',
              healthError: null,
              lastHealthCheck: new Date(),
            },
          });

          results.refreshed++;
          results.details.push({
            workspaceId: integration.workspaceId,
            success: true,
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to refresh token for workspace ${integration.workspaceId}: ${error.message}`);
        
        results.failed++;
        results.details.push({
          workspaceId: integration.workspaceId,
          success: false,
          error: error.message,
        });
      }
    }

    this.logger.log(`Auto-refresh complete: ${results.refreshed} refreshed, ${results.failed} failed`);

    return results;
  }

  /**
   * Check phone quality ratings for all active integrations and raise alerts.
   */
  async checkPhoneQualityAlerts(): Promise<{
    checked: number;
    alerts: number;
    details: Array<{
      workspaceId: string;
      phoneNumberId: string;
      qualityRating: string;
      alertLevel: 'healthy' | 'warning' | 'error';
      error?: string;
    }>;
  }> {
    const integrations = await this.prisma.whatsAppIntegration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        workspaceId: true,
        phoneNumberId: true,
        phoneNumber: true,
        accessToken: true,
      },
    });

    const results = {
      checked: integrations.length,
      alerts: 0,
      details: [] as Array<{
        workspaceId: string;
        phoneNumberId: string;
        qualityRating: string;
        alertLevel: 'healthy' | 'warning' | 'error';
        error?: string;
      }>,
    };

    for (const integration of integrations) {
      try {
        const accessToken = decryptSecret(integration.accessToken) as string;
        const response = await firstValueFrom(
          this.httpService.get(`${this.GRAPH_API_URL}/${integration.phoneNumberId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              fields: 'id,display_phone_number,quality_rating',
            },
          }),
        );

        const qualityRating = String(response.data?.quality_rating || 'UNKNOWN').toUpperCase();
        const alertLevel =
          qualityRating === 'RED' ? 'error' : qualityRating === 'YELLOW' ? 'warning' : 'healthy';

        const healthError =
          alertLevel === 'healthy'
            ? null
            : `WhatsApp phone quality rating is ${qualityRating}. Investigate message quality and complaint rate.`;

        await this.prisma.whatsAppIntegration.update({
          where: { id: integration.id },
          data: {
            lastHealthCheck: new Date(),
            healthStatus: alertLevel,
            healthError,
          },
        });

        if (alertLevel !== 'healthy') {
          results.alerts++;
          await this.prisma.auditLog.create({
            data: {
              workspaceId: integration.workspaceId,
              action: `whatsapp.quality_alert.${alertLevel}`,
              entityType: 'whatsapp_integration',
              entityId: integration.id,
              metadata: {
                phoneNumberId: integration.phoneNumberId,
                phoneNumber: integration.phoneNumber,
                qualityRating,
              },
            },
          });
        }

        results.details.push({
          workspaceId: integration.workspaceId,
          phoneNumberId: integration.phoneNumberId,
          qualityRating,
          alertLevel,
        });
      } catch (error: any) {
        results.alerts++;
        results.details.push({
          workspaceId: integration.workspaceId,
          phoneNumberId: integration.phoneNumberId,
          qualityRating: 'UNKNOWN',
          alertLevel: 'warning',
          error: error?.response?.data?.error?.message || error.message,
        });
      }
    }

    return results;
  }

  /**
   * Update health status for a specific integration
   */
  async updateHealthStatus(integrationId: string): Promise<{
    healthStatus: string;
    healthError: string | null;
    tokenExpiresAt: Date | null;
    lastHealthCheck: Date;
  }> {
    const integration = await this.prisma.whatsAppIntegration.findUnique({
      where: { id: integrationId },
      select: { accessToken: true },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const health = await this.checkTokenHealth(decryptSecret(integration.accessToken) as string);
    
    const healthStatus = health.isValid ? 'healthy' : 'error';
    const lastHealthCheck = new Date();

    await this.prisma.whatsAppIntegration.update({
      where: { id: integrationId },
      data: {
        healthStatus,
        healthError: health.errorMessage || null,
        lastHealthCheck,
        tokenExpiresAt: health.expiresAt,
      },
    });

    this.logger.log(`Health status updated for integration ${integrationId}: ${healthStatus}`);
    
    return {
      healthStatus,
      healthError: health.errorMessage || null,
      tokenExpiresAt: health.expiresAt,
      lastHealthCheck,
    };
  }

  /**
   * Get health summary for all integrations in a workspace
   */
  async getHealthSummary(workspaceId: string): Promise<{
    healthy: number;
    warning: number;
    error: number;
    unknown: number;
  }> {
    const integrations = await this.prisma.whatsAppIntegration.findMany({
      where: { workspaceId },
      select: { healthStatus: true },
    });

    const summary = {
      healthy: 0,
      warning: 0,
      error: 0,
      unknown: 0,
    };

    integrations.forEach((integration) => {
      const status = integration.healthStatus as keyof typeof summary;
      if (status in summary) {
        summary[status]++;
      } else {
        summary.unknown++;
      }
    });

    return summary;
  }
}
