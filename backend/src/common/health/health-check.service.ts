import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { decryptSecret, encryptSecret } from '../utils/crypto.util';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Check health of all WhatsApp integrations
   * Returns a summary of healthy vs unhealthy integrations
   */
  async checkAllWhatsAppIntegrations(): Promise<{
    total: number;
    healthy: number;
    warning: number;
    error: number;
    details: any[];
  }> {
    const integrations = await this.prisma.whatsAppIntegration.findMany({
      where: { isActive: true },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const results: any[] = [];
    let healthy = 0;
    let warning = 0;
    let error = 0;

    for (const integration of integrations) {
      const result = await this.checkWhatsAppIntegration(integration.id);
      results.push({
        workspaceId: integration.workspaceId,
        workspaceName: integration.workspace.name,
        phoneNumber: integration.phoneNumber,
        ...result,
      });

      if (result.status === 'healthy') healthy++;
      else if (result.status === 'warning') warning++;
      else if (result.status === 'error') error++;
    }

    return {
      total: integrations.length,
      healthy,
      warning,
      error,
      details: results,
    };
  }

  /**
   * Check health of a specific WhatsApp integration
   */
  async checkWhatsAppIntegration(integrationId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
    tokenExpiresIn?: number;
    canRefresh?: boolean;
  }> {
    const integration = await this.prisma.whatsAppIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return {
        status: 'error',
        message: 'Integration not found',
      };
    }

    try {
      // Check token expiration first
      if (integration.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(integration.tokenExpiresAt);
        const daysUntilExpiry = Math.floor(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Token already expired
        if (daysUntilExpiry < 0) {
          await this.updateHealthStatus(integrationId, 'error', 'Access token has expired');
          
          // Try to refresh if possible
          if (integration.refreshToken) {
            this.logger.log(`Token expired for ${integration.phoneNumber}, attempting refresh...`);
            const refreshed = await this.refreshAccessToken(integrationId);
            if (refreshed) {
              return {
                status: 'healthy',
                message: 'Token was expired but successfully refreshed',
              };
            }
          }

          return {
            status: 'error',
            message: `Access token expired ${Math.abs(daysUntilExpiry)} days ago`,
            canRefresh: !!integration.refreshToken,
          };
        }

        // Token expiring soon (within 7 days)
        if (daysUntilExpiry <= 7) {
          await this.updateHealthStatus(
            integrationId,
            'warning',
            `Token expires in ${daysUntilExpiry} days`,
          );

          // Try to refresh proactively if possible
          if (integration.refreshToken && daysUntilExpiry <= 3) {
            this.logger.log(`Token expiring soon for ${integration.phoneNumber}, refreshing...`);
            await this.refreshAccessToken(integrationId);
          }

          return {
            status: 'warning',
            message: `Token expires in ${daysUntilExpiry} days`,
            tokenExpiresIn: daysUntilExpiry,
            canRefresh: !!integration.refreshToken,
          };
        }
      }

      // Verify token with WhatsApp API
      const whatsappUrl = `https://graph.facebook.com/v17.0/${integration.phoneNumberId}`;
      
      const response = await axios.get(whatsappUrl, {
        headers: {
          Authorization: `Bearer ${decryptSecret(integration.accessToken)}`,
        },
        timeout: 5000, // Reduced from 10 seconds to 5 seconds
      });

      // Token is valid
      await this.updateHealthStatus(integrationId, 'healthy', null);

      return {
        status: 'healthy',
        message: 'WhatsApp integration is working correctly',
        tokenExpiresIn: integration.tokenExpiresAt
          ? Math.floor(
              (new Date(integration.tokenExpiresAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            )
          : undefined,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      await this.updateHealthStatus(integrationId, 'error', errorMessage);

      return {
        status: 'error',
        message: errorMessage,
        canRefresh: !!integration.refreshToken,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(integrationId: string): Promise<boolean> {
    try {
      const integration = await this.prisma.whatsAppIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration?.refreshToken) {
        this.logger.warn('Cannot refresh token: no refresh token available');
        return false;
      }

      const refreshToken = decryptSecret(integration.refreshToken) as string;

      // Call Meta's token refresh endpoint
      const response = await axios.post(
        'https://graph.facebook.com/v17.0/oauth/access_token',
        {
          grant_type: 'fb_exchange_token',
          client_id: this.config.get('META_APP_ID'),
          client_secret: this.config.get('META_APP_SECRET'),
          fb_exchange_token: refreshToken,
        },
      );

      const { access_token, expires_in } = response.data;

      // Update token in database
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      await this.prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          accessToken: encryptSecret(access_token) as string,
          tokenExpiresAt: expiresAt,
          healthStatus: 'healthy',
          healthError: null,
        },
      });

      this.logger.log(`Successfully refreshed token for integration ${integrationId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      return false;
    }
  }

  /**
   * Update health status in database
   */
  private async updateHealthStatus(
    integrationId: string,
    status: 'healthy' | 'warning' | 'error',
    errorMessage: string | null,
  ): Promise<void> {
    await this.prisma.whatsAppIntegration.update({
      where: { id: integrationId },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: status,
        healthError: errorMessage,
      },
    });
  }

  /**
   * Extract user-friendly error message from API error
   */
  private extractErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data?.error;
      
      if (errorData) {
        if (errorData.code === 190) {
          if (errorData.error_subcode === 463) {
            return 'Access token has expired';
          } else if (errorData.error_subcode === 467) {
            return 'Token password has been changed';
          }
          return 'Invalid access token';
        }
        
        return errorData.message || 'WhatsApp API error';
      }

      if (error.code === 'ECONNABORTED') {
        return 'Connection timeout - WhatsApp API not responding';
      }

      return error.message || 'Network error';
    }

    return 'Unknown error';
  }

  /**
   * Get integration status for a workspace
   */
  async getWorkspaceIntegrationStatus(workspaceId: string): Promise<{
    whatsapp: {
      connected: boolean;
      status: string;
      error?: string;
      expiresIn?: number;
    };
  }> {
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    if (!integration) {
      return {
        whatsapp: {
          connected: false,
          status: 'not_connected',
        },
      };
    }

    const health = await this.checkWhatsAppIntegration(integration.id);

    return {
      whatsapp: {
        connected: true,
        status: health.status,
        error: health.status !== 'healthy' ? health.message : undefined,
        expiresIn: health.tokenExpiresIn,
      },
    };
  }
}
