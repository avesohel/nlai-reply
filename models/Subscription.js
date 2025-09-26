const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
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

subscriptionSchema.statics.getPlans = function() {
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

subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.currentPeriodEnd;
};

subscriptionSchema.methods.getRemainingReplies = function(user) {
  if (!this.isActive()) return 0;

  const used = user.usage.currentPeriodReplies || 0;
  const limit = this.features.repliesPerMonth;

  return Math.max(0, limit - used);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);