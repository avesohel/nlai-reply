import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import User from '../models/User';
import Subscription from '../models/Subscription';
import { createPabblyCustomer, createSubscription as createPabblySubscription, cancelSubscription as cancelPabblySubscription, getSubscription as getPabblySubscription, reactivateSubscription as reactivatePabblySubscription, getCustomerInvoices } from '../services/pabblyService';

const router = express.Router();

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = Subscription.getPlans();
    res.json({ plans });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create', auth, async (req: Request, res: Response) => {
  try {
    const { plan, interval = 'month' } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid subscription plan' });
    }

    if (user.subscription) {
      return res.status(400).json({ message: 'User already has a subscription' });
    }

    let pabblyCustomerId = user.pabblyCustomerId;

    if (!pabblyCustomerId) {
      const customer = await createPabblyCustomer(user.email, user.name);
      pabblyCustomerId = customer.id;
      user.pabblyCustomerId = pabblyCustomerId;
      await user.save();
    }

    const plans = Subscription.getPlans();
    const selectedPlan = (plans as any)[plan];

    const pabblySubscription = await createPabblySubscription(
      pabblyCustomerId,
      plan,
      interval as 'monthly' | 'yearly'
    );

    const subscription = new Subscription({
      user: user._id,
      plan,
      pabblySubscriptionId: pabblySubscription.id,
      pabblyProductId: pabblySubscription.product_id || '',
      pabblyCustomerId: pabblyCustomerId,
      currentPeriodStart: new Date(pabblySubscription.current_period_start),
      currentPeriodEnd: new Date(pabblySubscription.current_period_end),
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
      paymentUrl: pabblySubscription.payment_url || null
    });
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/cancel', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!user.subscription) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    const subscription = await Subscription.findById(user.subscription);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await cancelPabblySubscription(subscription.pabblySubscriptionId!);

    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = new Date();
    await subscription.save();

    res.json({
      message: 'Subscription will be canceled at the end of the current period',
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reactivate', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!user.subscription) {
      return res.status(400).json({ message: 'No subscription found' });
    }

    const subscription = await Subscription.findById(user.subscription);

    if (!subscription || !subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ message: 'Subscription is not scheduled for cancellation' });
    }

    const pabblyStatus = await getPabblySubscription(subscription.pabblySubscriptionId!);

    if (pabblyStatus.cancel_at_period_end) {
      await reactivatePabblySubscription(subscription.pabblySubscriptionId!);
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;
    await subscription.save();

    res.json({
      message: 'Subscription reactivated successfully',
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!user.pabblyCustomerId) {
      return res.json({ invoices: [] });
    }

    const invoices = await getCustomerInvoices(user.pabblyCustomerId, 10);

    res.json({
      invoices: invoices.map((invoice: any) => ({
        id: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created_at),
        hostedInvoiceUrl: invoice.invoice_url || null,
        invoicePdf: invoice.pdf_url || null
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;