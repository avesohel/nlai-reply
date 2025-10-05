import axios from 'axios';

interface PabblyConfig {
  apiKey: string;
  baseUrl: string;
}

// Default Pabbly Payments configuration (update with actual API details)
const PABBLY_CONFIG: PabblyConfig = {
  apiKey: process.env.PABBLY_API_KEY || '',
  baseUrl: 'https://payments.pabbly.com/api/v1', // Update with actual base URL
};

export type PlanType = 'basic' | 'pro' | 'enterprise';
export type PabblyIntervalType = 'monthly' | 'yearly';

// Pabbly plan/product IDs - These need to be configured in Pabbly dashboard
const PABBLY_PRODUCT_IDS: Record<PlanType, Record<PabblyIntervalType, string>> = {
  basic: {
    monthly: process.env.PABBLY_BASIC_MONTHLY_PRODUCT_ID || '',
    yearly: process.env.PABBLY_BASIC_YEARLY_PRODUCT_ID || '',
  },
  pro: {
    monthly: process.env.PABBLY_PRO_MONTHLY_PRODUCT_ID || '',
    yearly: process.env.PABBLY_PRO_YEARLY_PRODUCT_ID || '',
  },
  enterprise: {
    monthly: process.env.PABBLY_ENTERPRISE_MONTHLY_PRODUCT_ID || '',
    yearly: process.env.PABBLY_ENTERPRISE_YEARLY_PRODUCT_ID || '',
  },
};

// Create authorized axios instance for Pabbly API
const pabblyClient = axios.create({
  baseURL: PABBLY_CONFIG.baseUrl,
  headers: {
    'Authorization': `Bearer ${PABBLY_CONFIG.apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interface definitions for Pabbly API responses
interface PabblyCustomer {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface PabblySubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_end?: string;
}

interface PabblyPaymentLink {
  id: string;
  url: string;
  status: 'active' | 'expired';
  expires_at?: string;
}

interface PabblyWebhookEvent {
  id: string;
  type: string;
  data: any;
}

// Customer Management
export const createPabblyCustomer = async (email: string, name: string): Promise<PabblyCustomer> => {
  try {
    const response = await pabblyClient.post('/customers', {
      email,
      name,
      source: 'nlai-reply', // Custom metadata
    });

    return response.data;
  } catch (error: any) {
    console.error('Pabbly create customer error:', error.response?.data || error.message);
    throw new Error(`Failed to create customer: ${error.response?.data?.message || error.message}`);
  }
};

export const getPabblyCustomer = async (customerId: string): Promise<PabblyCustomer> => {
  try {
    const response = await pabblyClient.get(`/customers/${customerId}`);
    return response.data;
  } catch (error: any) {
    console.error('Pabbly get customer error:', error.response?.data || error.message);
    throw new Error(`Failed to get customer: ${error.response?.data?.message || error.message}`);
  }
};

// Subscription Management
export const createSubscription = async (
  customerId: string,
  plan: PlanType,
  interval: PabblyIntervalType = 'monthly'
): Promise<PabblySubscription & { payment_url?: string }> => {
  try {
    const productId = PABBLY_PRODUCT_IDS[plan][interval];

    if (!productId) {
      throw new Error(`Invalid plan or interval: ${plan}/${interval}`);
    }

    // Create subscription with payment link
    const response = await pabblyClient.post('/subscriptions', {
      customer_id: customerId,
      product_id: productId,
      trial_days: 7, // Optional trial
      metadata: {
        plan,
        interval,
        source: 'nlai-reply',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Pabbly create subscription error:', error.response?.data || error.message);
    throw new Error(`Failed to create subscription: ${error.response?.data?.message || error.message}`);
  }
};

export const getSubscription = async (subscriptionId: string): Promise<PabblySubscription> => {
  try {
    const response = await pabblyClient.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Pabbly get subscription error:', error.response?.data || error.message);
    throw new Error(`Failed to get subscription: ${error.response?.data?.message || error.message}`);
  }
};

export const cancelSubscription = async (subscriptionId: string): Promise<PabblySubscription> => {
  try {
    const response = await pabblyClient.post(`/subscriptions/${subscriptionId}/cancel`, {
      cancel_at_period_end: true,
    });
    return response.data;
  } catch (error: any) {
    console.error('Pabbly cancel subscription error:', error.response?.data || error.message);
    throw new Error(`Failed to cancel subscription: ${error.response?.data?.message || error.message}`);
  }
};

export const reactivateSubscription = async (subscriptionId: string): Promise<PabblySubscription> => {
  try {
    const response = await pabblyClient.post(`/subscriptions/${subscriptionId}/reactivate`);
    return response.data;
  } catch (error: any) {
    console.error('Pabbly reactivate subscription error:', error.response?.data || error.message);
    throw new Error(`Failed to reactivate subscription: ${error.response?.data?.message || error.message}`);
  }
};

// Payment Link Management
export const createPaymentLink = async (
  customerId: string,
  productId: string,
  amount?: number,
  currency: string = 'usd'
): Promise<PabblyPaymentLink> => {
  try {
    const payload: any = {
      customer_id: customerId,
      product_id: productId,
      currency: currency.toUpperCase(),
    };

    if (amount) {
      payload.amount = amount; // Amount in smallest currency unit (cents for USD)
    }

    const response = await pabblyClient.post('/payment-links', payload);
    return response.data;
  } catch (error: any) {
    console.error('Pabbly create payment link error:', error.response?.data || error.message);
    throw new Error(`Failed to create payment link: ${error.response?.data?.message || error.message}`);
  }
};

// Invoice/Invoices Management
export const getCustomerInvoices = async (customerId: string, limit: number = 10): Promise<any[]> => {
  try {
    const response = await pabblyClient.get('/invoices', {
      params: {
        customer_id: customerId,
        limit,
      },
    });
    return response.data.data || [];
  } catch (error: any) {
    console.error('Pabbly get invoices error:', error.response?.data || error.message);
    throw new Error(`Failed to get invoices: ${error.response?.data?.message || error.message}`);
  }
};

// Webhook verification for Pabbly
export const verifyWebhook = (body: any, signature: string, secret: string): boolean => {
  // Pabbly webhook verification logic - adjust based on their documentation
  try {
    // TODO: Implement webhook signature verification based on Pabbly's webhook docs
    // Typically involves HMAC-SHA256 of the body with your webhook secret
    return true; // Placeholder - implement proper verification
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return false;
  }
};

// Plan/Product ID getters
export const getProductId = (plan: PlanType, interval: PabblyIntervalType): string | undefined => {
  return PABBLY_PRODUCT_IDS[plan][interval];
};

export const getPlanFromProductId = (productId: string): { plan: PlanType; interval: PabblyIntervalType } | null => {
  for (const [plan, intervals] of Object.entries(PABBLY_PRODUCT_IDS)) {
    for (const [interval, pId] of Object.entries(intervals)) {
      if (pId === productId) {
        return { plan: plan as PlanType, interval: interval as PabblyIntervalType };
      }
    }
  }
  return null;
};

export default {
  createPabblyCustomer,
  getPabblyCustomer,
  createSubscription,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  createPaymentLink,
  getCustomerInvoices,
  verifyWebhook,
  getProductId,
  getPlanFromProductId,
};