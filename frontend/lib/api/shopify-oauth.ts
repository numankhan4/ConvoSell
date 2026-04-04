import api from '../api';

/**
 * Shopify OAuth API helpers
 */

export interface OAuthInstallResponse {
  installUrl: string;
}

export interface OAuthStatusResponse {
  connected: boolean;
  shop?: string;
  installedAt?: Date;
  scopes?: string[];
}

/**
 * Get OAuth installation URL
 * @param shopDomain - Shop domain (e.g., mystore.myshopify.com)
 */
export const getOAuthInstallUrl = async (shopDomain: string): Promise<OAuthInstallResponse> => {
  const response = await api.get('/shopify/oauth/install', {
    params: { shop: shopDomain },
  });
  return response.data;
};

/**
 * Get OAuth connection status
 */
export const getOAuthStatus = async (): Promise<OAuthStatusResponse> => {
  const response = await api.get('/shopify/oauth/status');
  return response.data;
};

/**
 * Disconnect OAuth connection
 */
export const disconnectOAuth = async (): Promise<void> => {
  await api.delete('/shopify/oauth/disconnect');
};
