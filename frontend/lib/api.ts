import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15-second global timeout
});

// Add request interceptor to include auth token and workspace ID
api.interceptors.request.use((config) => {
  // Get auth data from store
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    
    // Add Authorization token
    if (state?.token) {
      config.headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    // Add workspace ID
    if (state?.currentWorkspace) {
      config.headers['x-workspace-id'] = state.currentWorkspace.id;
    }
  }
  return config;
});

export default api;

// API functions
export const ordersApi = {
  getOrders: (params?: any) => api.get('/orders', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  getStatistics: (params?: any) => api.get('/orders/statistics', { params }),
  exportOrders: (format: 'json' | 'csv' = 'json') =>
    api.get('/orders/export', {
      params: { format },
      responseType: 'blob',
    }),
};

export const fraudApi = {
  checkOrder: (data: {
    orderId: string;
    forceRecompute?: boolean;
    includeGeo?: boolean;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }) => api.post('/fraud/check', data),
  checkBatch: (data: {
    orderIds: string[];
    forceRecompute?: boolean;
    includeGeo?: boolean;
  }) => api.post('/fraud/check-batch', data),
  getReport: (orderId: string) => api.get(`/fraud/report/${orderId}`),
  getSummaries: (orderIds: string[]) =>
    api.get('/fraud/summaries', {
      params: {
        orderIds: orderIds.join(','),
      },
    }),
};

export const crmApi = {
  getContacts: (params?: any) => api.get('/crm/contacts', { params }),
  getContact: (id: string) => api.get(`/crm/contacts/${id}`),
  createContact: (data: any) => api.post('/crm/contacts', data),
  exportContacts: (format: 'json' | 'csv' = 'json') =>
    api.get('/crm/contacts/export', {
      params: { format },
      responseType: 'blob',
    }),
  getConversations: (params?: any) => api.get('/crm/conversations', { params }),
  getConversation: (id: string) => api.get(`/crm/conversations/${id}`),
  getTags: () => api.get('/crm/tags'),
  createTag: (data: any) => api.post('/crm/tags', data),
};

export const whatsappApi = {
  sendMessage: (to: string, message: string) =>
    api.post('/whatsapp/send', { to, message }),
};

export const automationsApi = {
  getAutomations: () => api.get('/automations'),
  createAutomation: (data: any) => api.post('/automations', data),
  toggleAutomation: (id: string, isActive: boolean) =>
    api.patch(`/automations/${id}/toggle`, { isActive }),
  executeManually: (orderId: string, automationId?: string) =>
    api.post(`/automations/execute/${orderId}`, { automationId }),
  deleteAutomation: (id: string) => api.delete(`/automations/${id}`),
  deleteMultiple: (automationIds: string[]) =>
    api.post('/automations/delete-multiple', { automationIds }),
};

export const healthApi = {
  getWorkspaceHealth: () => api.get('/health/workspace'),
  getSystemHealth: () => api.get('/health/system'),
};
