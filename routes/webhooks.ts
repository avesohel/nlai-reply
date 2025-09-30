import express, { Request, Response } from 'express';
import { stripe } from '../services/stripeService';
import User from '../models/User';
import Subscription from '../models/Subscription';

const router = express.Router();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret!);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleSubscriptionUpdate(stripeSubscription: any) {
  const user = await User.findOne({ stripeCustomerId: stripeSubscription.customer });

  if (!user) {
    console.error('User not found for customer:', stripeSubscription.customer);
    return;
  }

  const priceId = stripeSubscription.items.data[0].price.id;
  const planMapping: { [key: string]: string } = {
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!]: 'basic',
    [process.env.STRIPE_BASIC_YEARLY_PRICE_ID!]: 'basic',
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]: 'pro',
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID!]: 'pro',
    [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!]: 'enterprise',
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!]: 'enterprise'
  };

  const plan = planMapping[priceId];
  if (!plan) {
    console.error('Unknown price ID:', priceId);
    return;
  }

  const plans = Subscription.getPlans() as any;

  let subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });

  if (subscription) {
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    if (stripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }
  } else {
    subscription = new Subscription({
      user: user._id,
      plan,
      status: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      features: plans[plan].features,
      pricing: {
        amount: stripeSubscription.items.data[0].price.unit_amount / 100,
        currency: stripeSubscription.items.data[0].price.currency,
        interval: stripeSubscription.items.data[0].price.recurring.interval
      }
    });

    user.subscription = subscription._id;
  }

  await subscription.save();
  await user.save();

  console.log(`Subscription ${stripeSubscription.status} for user ${user.email}`);
}

async function handleSubscriptionCanceled(stripeSubscription: any) {
  const subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });

  if (subscription) {
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    await subscription.save();

    const user = await User.findById(subscription.user);
    if (user) {
      console.log(`Subscription canceled for user ${user.email}`);
    }
  }
}

async function handlePaymentSucceeded(invoice: any) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });

  if (!user) {
    console.error('User not found for payment succeeded webhook');
    return;
  }

  if (invoice.billing_reason === 'subscription_cycle') {
    user.usage.currentPeriodStart = new Date();
    user.usage.currentPeriodReplies = 0;
    await user.save();

    console.log(`Payment succeeded and usage reset for user ${user.email}`);
  }
}

async function handlePaymentFailed(invoice: any) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });

  if (!user) {
    console.error('User not found for payment failed webhook');
    return;
  }

  const subscription = await Subscription.findOne({ user: user._id });
  if (subscription) {
    subscription.status = 'past_due';
    await subscription.save();
  }

  console.log(`Payment failed for user ${user.email}`);
}

async function handleTrialWillEnd(stripeSubscription: any) {
  const user = await User.findOne({ stripeCustomerId: stripeSubscription.customer });

  if (!user) {
    console.error('User not found for trial ending webhook');
    return;
  }

  console.log(`Trial will end for user ${user.email}`);
}

export default router;