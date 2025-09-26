const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { createStripeCustomer, createSubscription, cancelSubscription, getSubscriptionStatus } = require('../services/stripeService');
const router = express.Router();

router.get('/plans', async (req, res) => {
  try {
    const plans = Subscription.getPlans();
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create', auth, async (req, res) => {
  try {
    const { plan, interval = 'month' } = req.body;
    const user = req.user;

    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid subscription plan' });
    }

    if (user.subscription) {
      return res.status(400).json({ message: 'User already has a subscription' });
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(user.email, user.name);
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const plans = Subscription.getPlans();
    const selectedPlan = plans[plan];

    const stripeSubscription = await createSubscription(
      stripeCustomerId,
      plan,
      interval
    );

    const subscription = new Subscription({
      user: user._id,
      plan,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0].price.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      features: selectedPlan.features,
      pricing: {
        amount: interval === 'year' ? selectedPlan.price.yearly : selectedPlan.price.monthly,
        interval
      }
    });

    await subscription.save();

    user.subscription = subscription._id;
    user.usage.currentPeriodStart = subscription.currentPeriodStart;
    user.usage.currentPeriodReplies = 0;
    await user.save();

    res.json({
      message: 'Subscription created successfully',
      subscription,
      clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/cancel', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscription) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    const subscription = await Subscription.findById(user.subscription);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await cancelSubscription(subscription.stripeSubscriptionId);

    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = new Date();
    await subscription.save();

    res.json({
      message: 'Subscription will be canceled at the end of the current period',
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reactivate', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscription) {
      return res.status(400).json({ message: 'No subscription found' });
    }

    const subscription = await Subscription.findById(user.subscription);

    if (!subscription || !subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ message: 'Subscription is not scheduled for cancellation' });
    }

    const stripeStatus = await getSubscriptionStatus(subscription.stripeSubscriptionId);

    if (stripeStatus.cancel_at_period_end) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;
    await subscription.save();

    res.json({
      message: 'Subscription reactivated successfully',
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscription) {
      return res.json({
        hasSubscription: false,
        message: 'No active subscription'
      });
    }

    const subscription = await Subscription.findById(user.subscription);

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        message: 'Subscription not found'
      });
    }

    const remainingReplies = subscription.getRemainingReplies(user);

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        features: subscription.features,
        pricing: subscription.pricing
      },
      usage: {
        current: user.usage.currentPeriodReplies,
        limit: subscription.features.repliesPerMonth,
        remaining: remainingReplies
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 10
    });

    res.json({
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;