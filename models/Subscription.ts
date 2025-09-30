import mongoose, { Document, Schema, Model } from 'mongoose';

export type PlanType = 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
export type BillingInterval = 'month' | 'year';

export interface ISubscriptionFeatures {
  repliesPerMonth: number;
  channels: number;
  prioritySupport: boolean;
  analytics: boolean;
  customTemplates: boolean;
}

export interface ISubscriptionPricing {
  amount: number;
  currency: string;
  interval: BillingInterval;
}

export interface IPlanDetails {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: ISubscriptionFeatures;
}

export interface IPlans {
  basic: IPlanDetails;
  pro: IPlanDetails;
  enterprise: IPlanDetails;
}

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: PlanType;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  features: ISubscriptionFeatures;
  pricing: ISubscriptionPricing;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isActive(): boolean;
  getRemainingReplies(user: { usage: { currentPeriodReplies?: number } }): number;
}

export interface ISubscriptionModel extends Model<ISubscription> {
  getPlans(): IPlans;
}

const subscriptionSchema = new Schema<ISubscription>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete'],
    default: 'active'
  },
  stripeSubscriptionId: String,
  stripePriceId: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: Date,
  features: {
    repliesPerMonth: Number,
    channels: Number,
    prioritySupport: Boolean,
    analytics: Boolean,
    customTemplates: Boolean
  },
  pricing: {
    amount: Number,
    currency: { type: String, default: 'usd' },
    interval: { type: String, enum: ['month', 'year'], default: 'month' }
  }
}, {
  timestamps: true
});

subscriptionSchema.statics.getPlans = function(): IPlans {
  return {
    basic: {
      name: 'Basic',
      price: { monthly: 9.99, yearly: 99 },
      features: {
        repliesPerMonth: 100,
        channels: 1,
        prioritySupport: false,
        analytics: false,
        customTemplates: false
      }
    },
    pro: {
      name: 'Pro',
      price: { monthly: 29.99, yearly: 299 },
      features: {
        repliesPerMonth: 500,
        channels: 5,
        prioritySupport: true,
        analytics: true,
        customTemplates: true
      }
    },
    enterprise: {
      name: 'Enterprise',
      price: { monthly: 99.99, yearly: 999 },
      features: {
        repliesPerMonth: 2000,
        channels: 25,
        prioritySupport: true,
        analytics: true,
        customTemplates: true
      }
    }
  };
};

subscriptionSchema.methods.isActive = function(this: ISubscription): boolean {
  return this.status === 'active' && new Date() < (this.currentPeriodEnd || new Date());
};

subscriptionSchema.methods.getRemainingReplies = function(
  this: ISubscription,
  user: { usage: { currentPeriodReplies?: number } }
): number {
  if (!this.isActive()) return 0;

  const used = user.usage.currentPeriodReplies || 0;
  const limit = this.features.repliesPerMonth;

  return Math.max(0, limit - used);
};

export default mongoose.model<ISubscription, ISubscriptionModel>('Subscription', subscriptionSchema);