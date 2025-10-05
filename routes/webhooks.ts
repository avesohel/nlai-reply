import express, { Request, Response } from 'express';
import { verifyWebhook, getPlanFromProductId } from '../services/pabblyService';
import User from '../models/User';
import Subscription from '../models/Subscription';

const router = express.Router();

const pabblyWebhookSecret = process.env.PABBLY_WEBHOOK_SECRET;

router.post('/pabbly', async (req: Request, res: Response) => {
  const signature = req.headers['x-pabbly-signature'] as string || req.headers['x-hub-signature-256'] as string;

  let event;

  try {
    // For Pabbly webhooks, verify signature if available
    // Adjust this based on Pabbly's actual webhook verification method
    if (signature && pabblyWebhookSecret) {
      const isValid = verifyWebhook(JSON.stringify(req.body), signature, pabblyWebhookSecret);
      if (!isValid) {
        console.log('Pabbly webhook signature verification failed');
        return res.status(400).send('Webhook signature verification failed');
      }
    }
    event = req.body; // Pabbly sends the event data directly
  } catch (err: any) {
    console.log(`Pabbly webhook processing failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdate(event.data);
        break;

      case 'subscription.cancelled':
      case 'subscription.deleted':
        await handleSubscriptionCanceled(event.data);
        break;

      case 'payment.succeeded':
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data);
        break;

      case 'payment.failed':
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data);
        break;

      case 'subscription.trial_will_end':
        await handleTrialWillEnd(event.data);
        break;

      default:
        console.log(`Unhandled Pabbly event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleSubscriptionUpdate(pabblySubscription: any) {
  const user = await User.findOne({ pabblyCustomerId: pabblySubscription.customer_id });

  if (!user) {
    console.error('User not found for customer:', pabblySubscription.customer_id);
    return;
  }

  const planInfo = getPlanFromProductId(pabblySubscription.product_id);
  if (!planInfo) {
    console.error('Unknown product ID:', pabblySubscription.product_id);
    return;
  }

  const plans = Subscription.getPlans() as any;

  let subscription = await Subscription.findOne({ pabblySubscriptionId: pabblySubscription.id });

  if (subscription) {
    subscription.status = pabblySubscription.status;
    subscription.currentPeriodStart = new Date(pabblySubscription.current_period_start);
    subscription.currentPeriodEnd = new Date(pabblySubscription.current_period_end);
    subscription.cancelAtPeriodEnd = pabblySubscription.cancel_at_period_end;

    if (pabblySubscription.canceled_at) {
      subscription.canceledAt = new Date(pabblySubscription.canceled_at);
    }
  } else {
    subscription = new Subscription({
      user: user._id,
      plan: planInfo.plan,
      status: pabblySubscription.status,
      pabblySubscriptionId: pabblySubscription.id,
      pabblyProductId: pabblySubscription.product_id,
      pabblyCustomerId: pabblySubscription.customer_id,
      currentPeriodStart: new Date(pabblySubscription.current_period_start),
      currentPeriodEnd: new Date(pabblySubscription.current_period_end),
      features: plans[planInfo.plan].features,
      pricing: {
        amount: plans[planInfo.plan].price[planInfo.interval === 'yearly' ? 'yearly' : 'monthly'],
        currency: 'usd',
        interval: planInfo.interval === 'yearly' ? 'year' : 'month'
      }
    });

    user.subscription = subscription._id;
  }

  await subscription.save();
  await user.save();

  console.log(`Subscription ${pabblySubscription.status} for user ${user.email}`);
}

async function handleSubscriptionCanceled(pabblySubscription: any) {
  const subscription = await Subscription.findOne({ pabblySubscriptionId: pabblySubscription.id });

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

async function handlePaymentSucceeded(paymentData: any) {
  // For Pabbly, extract customer_id from payment data
  const customerId = paymentData.customer_id || paymentData.customer;
  const user = await User.findOne({ pabblyCustomerId: customerId });

  if (!user) {
    console.error('User not found for payment succeeded webhook');
    return;
  }

  // Check if this is a recurring payment (subscription renewal)
  if (paymentData.billing_reason === 'subscription_cycle' || paymentData.subscription_id) {
    user.usage.currentPeriodStart = new Date();
    user.usage.currentPeriodReplies = 0;
    await user.save();

    console.log(`Payment succeeded and usage reset for user ${user.email}`);
  }
}

async function handlePaymentFailed(paymentData: any) {
  const customerId = paymentData.customer_id || paymentData.customer;
  const user = await User.findOne({ pabblyCustomerId: customerId });

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

async function handleTrialWillEnd(pabblySubscription: any) {
  const user = await User.findOne({ pabblyCustomerId: pabblySubscription.customer_id });

  if (!user) {
    console.error('User not found for trial ending webhook');
    return;
  }

  console.log(`Trial will end for user ${user.email}`);
}

export default router;