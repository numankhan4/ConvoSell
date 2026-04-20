export interface WhatsAppIntegration {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  isActive: boolean;
  tokenType?: string;
  tokenExpiresAt?: string;
  healthStatus?: string;
  healthError?: string;
  lastHealthCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyStore {
  id: string;
  shopDomain: string;
  clientId: string;
  scopes: string;
  isActive: boolean;
  installedAt: string;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  tokenType?: string;
  oauthInstalledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAlertItem {
  id: string;
  createdAt: string;
  action: string;
  severity: 'error' | 'warning' | 'info';
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, any>;
}

export interface WhatsAppAlertsResponse {
  total: number;
  limit: number;
  severity?: string;
  summary: {
    error: number;
    warning: number;
    info: number;
  };
  alerts: WhatsAppAlertItem[];
}
