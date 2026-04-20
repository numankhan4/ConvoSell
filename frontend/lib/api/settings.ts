import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

// Settings API
export const settingsApi = {
  // Order verification policy
  getOrderVerificationSettings: async (token: string) => {
    const response = await axios.get(`${API_URL}/settings/order-verification`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateOrderVerificationSettings: async (
    token: string,
    data: {
      enabled?: boolean;
      scope?: 'cod_only' | 'all_orders';
      firstFollowupMinutes?: number;
      finalTimeoutMinutes?: number;
      maxFollowups?: number;
      readAwareEscalation?: boolean;
    },
  ) => {
    const response = await axios.put(`${API_URL}/settings/order-verification`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Cart recovery policy
  getCartRecoverySettings: async (token: string) => {
    const response = await axios.get(`${API_URL}/settings/cart-recovery`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateCartRecoverySettings: async (
    token: string,
    data: {
      enabled?: boolean;
      firstReminderHours?: number;
      secondReminderHours?: number;
      maxReminders?: number;
      minCartValue?: number;
    },
  ) => {
    const response = await axios.put(`${API_URL}/settings/cart-recovery`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // WhatsApp Integration
  getWhatsAppIntegration: async (token: string) => {
    const response = await axios.get(`${API_URL}/settings/whatsapp`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  createWhatsAppIntegration: async (
    token: string,
    data: {
      phoneNumberId: string;
      phoneNumber: string;
      businessAccountId: string;
      accessToken: string;
      webhookVerifyToken?: string;
      isActive?: boolean;
    },
  ) => {
    const response = await axios.post(`${API_URL}/settings/whatsapp`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateWhatsAppIntegration: async (
    token: string,
    id: string,
    data: {
      phoneNumberId?: string;
      phoneNumber?: string;
      businessAccountId?: string;
      accessToken?: string;
      webhookVerifyToken?: string;
      isActive?: boolean;
    },
  ) => {
    const response = await axios.put(`${API_URL}/settings/whatsapp/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  deleteWhatsAppIntegration: async (token: string, id: string) => {
    const response = await axios.delete(`${API_URL}/settings/whatsapp/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  disconnectWhatsAppIntegration: async (id: string) => {
    const response = await axios.post(`${API_URL}/settings/whatsapp/${id}/disconnect`);
    return response.data;
  },

  restoreWhatsAppIntegration: async (id: string) => {
    const response = await axios.post(`${API_URL}/settings/whatsapp/${id}/restore`);
    return response.data;
  },

  // Shopify Store
  getShopifyStore: async (token: string) => {
    const response = await axios.get(`${API_URL}/settings/shopify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  createShopifyStore: async (
    token: string,
    data: {
      shopDomain: string;
      clientId: string;
      clientSecret: string;
      scopes: string;
      isActive?: boolean;
    },
  ) => {
    const response = await axios.post(`${API_URL}/settings/shopify`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateShopifyStore: async (
    token: string,
    id: string,
    data: {
      shopDomain?: string;
      clientId?: string;
      clientSecret?: string;
      scopes?: string;
      isActive?: boolean;
    },
  ) => {
    const response = await axios.put(`${API_URL}/settings/shopify/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  deleteShopifyStore: async (token: string, id: string) => {
    const response = await axios.delete(`${API_URL}/settings/shopify/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  disconnectShopifyStore: async (id: string) => {
    const response = await axios.post(`${API_URL}/settings/shopify/${id}/disconnect`);
    return response.data;
  },

  restoreShopifyStore: async (id: string) => {
    const response = await axios.post(`${API_URL}/settings/shopify/${id}/restore`);
    return response.data;
  },

  registerShopifyWebhooks: async (token: string) => {
    const response = await axios.post(`${API_URL}/settings/shopify/webhooks/register`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Connection Testing
  testWhatsAppConnection: async (
    token: string,
    credentials: {
      phoneNumberId: string;
      businessAccountId: string;
      accessToken: string;
    }
  ) => {
    const response = await axios.post(`${API_URL}/settings/whatsapp/test`, credentials, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  testShopifyConnection: async (
    token: string,
    credentials: {
      shopDomain: string;
      clientId: string;
      clientSecret: string;
    }
  ) => {
    const response = await axios.post(`${API_URL}/settings/shopify/test`, credentials, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Webhook URLs
  getWebhookUrls: async (token: string) => {
    const response = await axios.get(`${API_URL}/settings/webhook-urls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getWhatsAppAlerts: async (
    token: string,
    workspaceId: string,
    options?: {
      limit?: number;
      severity?: 'error' | 'warning' | 'info';
    },
  ): Promise<WhatsAppAlertsResponse> => {
    const response = await axios.get(`${API_URL}/settings/whatsapp/alerts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-workspace-id': workspaceId,
      },
      params: {
        ...(options?.limit ? { limit: options.limit } : {}),
        ...(options?.severity ? { severity: options.severity } : {}),
      },
    });
    return response.data;
  },
};
