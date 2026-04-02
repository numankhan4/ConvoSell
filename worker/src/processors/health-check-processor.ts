import { PrismaClient } from '@prisma/client';
import axios from 'axios';

/**
 * Periodic health check processor
 * Runs every 1 hour to check WhatsApp integrations
 */
export async function healthCheckProcessor(prisma: PrismaClient) {
  console.log('🏥 Running health checks for all WhatsApp integrations...');

  const integrations = await prisma.whatsAppIntegration.findMany({
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

  let healthyCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const integration of integrations) {
    const result = await checkIntegrationHealth(integration, prisma);
    
    if (result.status === 'healthy') healthyCount++;
    else if (result.status === 'warning') warningCount++;
    else if (result.status === 'error') errorCount++;
  }

  console.log(`✅ Health check complete:`);
  console.log(`   Healthy: ${healthyCount}`);
  console.log(`   Warning: ${warningCount}`);
  console.log(`   Error: ${errorCount}`);
}

async function checkIntegrationHealth(integration: any, prisma: PrismaClient) {
  try {
    // Check token expiration first
    if (integration.tokenExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(integration.tokenExpiresAt);
      const daysUntilExpiry = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Token expired
      if (daysUntilExpiry < 0) {
        await updateHealthStatus(
          integration.id,
          'error',
          `Token expired ${Math.abs(daysUntilExpiry)} days ago`,
          prisma,
        );

        // Try to refresh if possible
        if (integration.refreshToken) {
          console.log(`   Attempting to refresh expired token for ${integration.phoneNumber}...`);
          const refreshed = await refreshAccessToken(integration, prisma);
          if (refreshed) {
            return { status: 'healthy' };
          }
        }

        return { status: 'error' };
      }

      // Token expiring soon
      if (daysUntilExpiry <= 7) {
        await updateHealthStatus(
          integration.id,
          'warning',
          `Token expires in ${daysUntilExpiry} days`,
          prisma,
        );

        // Proactive refresh if expiring within 3 days
        if (integration.refreshToken && daysUntilExpiry <= 3) {
          console.log(`   Proactively refreshing token for ${integration.phoneNumber}...`);
          await refreshAccessToken(integration, prisma);
        }

        return { status: 'warning' };
      }
    }

    // Verify token with WhatsApp API
    const whatsappUrl = `https://graph.facebook.com/v17.0/${integration.phoneNumberId}`;
    
    await axios.get(whatsappUrl, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
      timeout: 10000,
    });

    await updateHealthStatus(integration.id, 'healthy', null, prisma);
    return { status: 'healthy' };

  } catch (error: any) {
    const errorMessage = extractErrorMessage(error);
    await updateHealthStatus(integration.id, 'error', errorMessage, prisma);
    
    console.error(`   ❌ ${integration.workspace.name} - ${integration.phoneNumber}: ${errorMessage}`);
    
    return { status: 'error' };
  }
}

async function refreshAccessToken(integration: any, prisma: PrismaClient): Promise<boolean> {
  try {
    const response = await axios.post(
      'https://graph.facebook.com/v17.0/oauth/access_token',
      {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: integration.refreshToken,
      },
    );

    const { access_token, expires_in } = response.data;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    await prisma.whatsAppIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: access_token,
        tokenExpiresAt: expiresAt,
        healthStatus: 'healthy',
        healthError: null,
      },
    });

    console.log(`   ✅ Token refreshed successfully for ${integration.phoneNumber}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed to refresh token: ${error?.message || String(error)}`);
    return false;
  }
}

async function updateHealthStatus(
  integrationId: string,
  status: 'healthy' | 'warning' | 'error',
  errorMessage: string | null,
  prisma: PrismaClient,
): Promise<void> {
  await prisma.whatsAppIntegration.update({
    where: { id: integrationId },
    data: {
      lastHealthCheck: new Date(),
      healthStatus: status,
      healthError: errorMessage,
    },
  });
}

function extractErrorMessage(error: any): string {
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
      return 'Connection timeout';
    }

    return error.message || 'Network error';
  }

  return 'Unknown error';
}
