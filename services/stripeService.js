const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const priceIds = {
  basic: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID
  }
};

const createStripeCustomer = async (email, name) => {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      source: 'youtube-reply-service'
    }
  });

  return customer;
};

const createSubscription = async (customerId, plan, interval = 'month') => {
  const priceId = priceIds[plan][interval === 'year' ? 'yearly' : 'monthly'];

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
      interval
    }
  });

  return subscription;
};

const cancelSubscription = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });

  return subscription;
};

const reactivateSubscription = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false
  });

  return subscription;
};

const getSubscriptionStatus = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

const updateSubscription = async (subscriptionId, newPriceId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations'
  });

  return updatedSubscription;
};

const createPaymentMethod = async (customerId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return paymentMethodId;
};

const getCustomerInvoices = async (customerId, limit = 10) => {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: limit
  });

  return invoices.data.map(invoice => ({
    id: invoice.id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: invoice.status,
    created: new Date(invoice.created * 1000),
    periodStart: new Date(invoice.period_start * 1000),
    periodEnd: new Date(invoice.period_end * 1000),
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf
  }));
};

const createCheckoutSession = async (customerId, priceId, successUrl, cancelUrl) => {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    trial_period_days: 7
  });

  return session;
};

const createPortalSession = async (customerId, returnUrl) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
};

const handleFailedPayment = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);

    if (latestInvoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        latestInvoice.payment_intent
      );

      if (paymentIntent.status === 'requires_payment_method') {
        await stripe.subscriptions.update(subscriptionId, {
          pause_collection: {
            behavior: 'mark_uncollectible'
          }
        });
      }
    }

    return subscription;
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
};

const getUsageStats = async (customerId) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all'
  });

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 12
  });

  return {
    subscriptions: subscriptions.data,
    invoices: invoices.data,
    totalSpent: invoices.data.reduce((sum, invoice) => sum + invoice.amount_paid, 0) / 100
  };
};

const validateWebhook = (body, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

module.exports = {
  createStripeCustomer,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionStatus,
  updateSubscription,
  createPaymentMethod,
  getCustomerInvoices,
  createCheckoutSession,
  createPortalSession,
  handleFailedPayment,
  getUsageStats,
  validateWebhook,
  priceIds
};