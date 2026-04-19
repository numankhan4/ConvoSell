import api from '../api';

export type BillingCycle = 'monthly' | 'yearly';

export interface BillingPlan {
  plan: 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  templateMessagesLimit: number;
  maxContacts: number;
  maxMembers: number;
  features: string[];
  estimatedMonthlyCost: number;
  monthlyTemplateCostEstimate?: number;
}

export interface BillingResponse {
  currentPlan: string;
  costs: {
    UTILITY_TEMPLATE: number;
    MARKETING_TEMPLATE: number;
    SESSION_MESSAGE: number;
    AVERAGE_TEMPLATE_COST: number;
  };
  plans: BillingPlan[];
  disclaimer?: string;
  workspace?: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    templateMessagesUsed: number;
    templateMessagesLimit: number;
    quotaResetAt: string;
  };
}

export const billingApi = {
  getWorkspaceBilling: async (): Promise<BillingResponse> => {
    const response = await api.get('/billing/workspace');
    return response.data;
  },

  getPlans: async (): Promise<BillingResponse> => {
    const response = await api.get('/billing/plans');
    return response.data;
  },

  upgradePlan: async (targetPlan: BillingPlan['plan'], billingCycle: BillingCycle = 'monthly') => {
    const response = await api.post('/billing/upgrade', { targetPlan, billingCycle });
    return response.data;
  },
};
