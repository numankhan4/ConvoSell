/**
 * Subscription tiers and pricing configuration
 */

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export interface PlanFeatures {
  plan: SubscriptionPlan;
  displayName: string;
  monthlyPrice: number; // PKR
  yearlyPrice: number; // PKR (with discount)
  templateMessagesLimit: number; // per month
  maxContacts: number;
  maxMembers: number;
  features: string[];
  estimatedMonthlyCost: number; // WhatsApp API costs at 50% usage
}

/**
 * WhatsApp Cloud API costs (approximate PKR rates)
 * Based on Meta's pricing for Pakistan market
 */
export const WHATSAPP_COSTS = {
  // Business-initiated conversations (template messages)
  UTILITY_TEMPLATE: 7, // PKR per message (authentication, order updates)
  MARKETING_TEMPLATE: 12, // PKR per message (promotions, offers)
  
  // User-initiated conversations (within 24h window)
  SESSION_MESSAGE: 0, // Free within active session
  
  // Average cost for order confirmation templates
  AVERAGE_TEMPLATE_COST: 7,
};

/**
 * Subscription plan configurations
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanFeatures> = {
  [SubscriptionPlan.FREE]: {
    plan: SubscriptionPlan.FREE,
    displayName: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    templateMessagesLimit: 0, // No template messages (session only)
    maxContacts: 100,
    maxMembers: 1,
    features: [
      'WhatsApp session messages only',
      'Manual order verification',
      '100 contacts',
      'Basic automation',
      'Email support',
    ],
    estimatedMonthlyCost: 0,
  },

  [SubscriptionPlan.STARTER]: {
    plan: SubscriptionPlan.STARTER,
    displayName: 'Starter',
    monthlyPrice: 2999,
    yearlyPrice: 29990, // 2 months free
    templateMessagesLimit: 50,
    maxContacts: 1000,
    maxMembers: 3,
    features: [
      '50 template messages/month',
      'Auto order confirmations',
      '1,000 contacts',
      'Advanced automation',
      'Priority email support',
      'Analytics dashboard',
    ],
    estimatedMonthlyCost: 175, // 50 templates × 50% usage × 7 PKR
  },

  [SubscriptionPlan.PRO]: {
    plan: SubscriptionPlan.PRO,
    displayName: 'Pro',
    monthlyPrice: 6999,
    yearlyPrice: 69990, // 2 months free
    templateMessagesLimit: 200,
    maxContacts: 5000,
    maxMembers: 10,
    features: [
      '200 template messages/month',
      'All Starter features',
      '5,000 contacts',
      'Custom message templates',
      'Phone + email support',
      'Advanced analytics',
      'Shopify integration',
    ],
    estimatedMonthlyCost: 700, // 200 templates × 50% usage × 7 PKR
  },

  [SubscriptionPlan.BUSINESS]: {
    plan: SubscriptionPlan.BUSINESS,
    displayName: 'Business',
    monthlyPrice: 14999,
    yearlyPrice: 149990, // 2 months free
    templateMessagesLimit: 1000,
    maxContacts: 25000,
    maxMembers: 50,
    features: [
      '1,000 template messages/month',
      'All Pro features',
      '25,000 contacts',
      'Unlimited automations',
      'Dedicated account manager',
      'White-label options',
      'API access',
    ],
    estimatedMonthlyCost: 3500, // 1000 templates × 50% usage × 7 PKR
  },

  [SubscriptionPlan.ENTERPRISE]: {
    plan: SubscriptionPlan.ENTERPRISE,
    displayName: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    templateMessagesLimit: -1, // Unlimited
    maxContacts: -1, // Unlimited
    maxMembers: -1, // Unlimited
    features: [
      'Unlimited template messages',
      'Unlimited contacts & members',
      'Custom integrations',
      'Dedicated infrastructure',
      'SLA guarantee',
      '24/7 priority support',
      'Custom contract terms',
    ],
    estimatedMonthlyCost: 0, // Varies by volume
  },
};

/**
 * Get plan features by tier
 */
export function getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return SUBSCRIPTION_PLANS[plan];
}

/**
 * Calculate profit margin for a plan
 */
export function calculatePlanMargins(plan: SubscriptionPlan, actualUsage: number = 0.5) {
  const features = SUBSCRIPTION_PLANS[plan];
  
  if (plan === SubscriptionPlan.FREE || plan === SubscriptionPlan.ENTERPRISE) {
    return {
      revenue: features.monthlyPrice,
      cost: 0,
      profit: features.monthlyPrice,
      margin: 100,
    };
  }

  const messagesUsed = features.templateMessagesLimit * actualUsage;
  const cost = messagesUsed * WHATSAPP_COSTS.AVERAGE_TEMPLATE_COST;
  const revenue = features.monthlyPrice;
  const profit = revenue - cost;
  const margin = ((profit / revenue) * 100).toFixed(1);

  return {
    revenue,
    cost: Math.round(cost),
    profit: Math.round(profit),
    margin: parseFloat(margin),
    messagesUsed: Math.round(messagesUsed),
  };
}

/**
 * Check if workspace can send template messages
 */
export function canSendTemplateMessage(
  plan: SubscriptionPlan,
  messagesUsed: number,
  messagesLimit: number,
): { allowed: boolean; reason?: string } {
  if (plan === SubscriptionPlan.FREE) {
    return {
      allowed: false,
      reason: 'Upgrade to Starter plan or higher to send template messages',
    };
  }

  if (plan === SubscriptionPlan.ENTERPRISE || messagesLimit === -1) {
    return { allowed: true };
  }

  if (messagesUsed >= messagesLimit) {
    return {
      allowed: false,
      reason: `Monthly quota exceeded (${messagesUsed}/${messagesLimit}). Upgrade plan or wait for reset.`,
    };
  }

  return { allowed: true };
}
