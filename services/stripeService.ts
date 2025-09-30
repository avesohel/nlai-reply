import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured properly - Stripe features disabled');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-08-16',
});

export type PlanType = 'basic' | 'pro' | 'enterprise';
export type IntervalType = 'month' | 'year';

interface PriceIds {
  [key: string]: {
    monthly?: string;
    yearly?: string;
  };
}

const priceIds: PriceIds = {
  basic: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
};

export const createStripeCustomer = async (email: string, name: string): Promise<Stripe.Customer> => {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      source: 'nlai-reply',
    },
  });

  return customer;
};

export const createSubscription = async (
  customerId: string,
  plan: PlanType,
  interval: IntervalType = 'month'
): Promise<Stripe.Subscription> => {
  const priceId = priceIds[plan]?.[interval === 'year' ? 'yearly' : 'monthly'];

  if (!priceId) {
    throw new Error(`Invalid plan or interval: ${plan}/${interval}`);
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    trial_period_days: 7,
    metadata: {
      plan,
      interval,
    },
  });

  return subscription;
};

export const cancelSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
};

export const reactivateSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
};

export const getSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

export const updateSubscription = async (
  subscriptionId: string,
  plan: PlanType,
  interval: IntervalType
): Promise<Stripe.Subscription> => {
  const priceId = priceIds[plan]?.[interval === 'year' ? 'yearly' : 'monthly'];

  if (!priceId) {
    throw new Error(`Invalid plan or interval: ${plan}/${interval}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
    }],
    metadata: {
      plan,
      interval,
    },
  });

  return updatedSubscription;
};

export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  customerId?: string
): Promise<Stripe.PaymentIntent> => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
};

export const handleWebhook = async (body: any, signature: string): Promise<Stripe.Event> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required');
  }

  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  return event;
};

export const getCustomer = async (customerId: string): Promise<Stripe.Customer> => {
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  return customer;
};

export const getInvoices = async (customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> => {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
};

export { stripe };

export default {
  createStripeCustomer,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscription,
  updateSubscription,
  createPaymentIntent,
  handleWebhook,
  getCustomer,
  getInvoices,
  stripe, // Export stripe instance for advanced usage
};