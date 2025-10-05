# Pabbly Payments Integration Guide

## 🏢 Business Details
**Business Name:** A&M Limited
**Product Name Suggestions:**
- 🌟 **NLAI Agent** - Professional and concise
- 🤖 **ReplyMate AI** - Friendly and approachable
- 💬 **CommentAI Pro** - Clearly describes functionality
- 🎯 **EngageAI** - Focuses on engagement, a key benefit
- 📱 **SocialReply Pro** - Emphasizes social media focus

## 💳 Pabbly Payments Integration

Complete integration of [Pabbly Payments](https://payments.pabbly.com) as a replacement for Stripe. All subscription and payment functionality has been migrated.

## 🔧 Setup Instructions

### Step 1: Create Pabbly Account
1. Go to [Pabbly Payments](https://payments.pabbly.com)
2. Sign up for a business account
3. Complete business verification (may require documents)

### Step 2: Get API Credentials
1. Go to **Settings → API & Webhooks**
2. Generate your API Key
3. Copy the API Key and Webhook Secret

### Step 3: Create Products
In Pabbly dashboard, create these subscription products:

```
📦 BASIC PLAN
   - Name: "NLAI Agent Basic"
   - Price: $9.99/month, $99/year
   - Description: "100 AI replies per month, 1 YouTube channel"

📦 PRO PLAN
   - Name: "NLAI Agent Pro"
   - Price: $29.99/month, $299/year
   - Description: "500 AI replies per month, up to 5 channels, analytics"

📦 ENTERPRISE PLAN
   - Name: "NLAI Agent Enterprise"
   - Price: $99.99/month, $999/year
   - Description: "2000 AI replies per month, up to 25 channels, priority support"
```

### Step 4: Configure Environment Variables
Add to your `.env` file:

```bash
# Pabbly Payments Configuration
PABBLY_API_KEY=your-pabbly-api-key-here
PABBLY_WEBHOOK_SECRET=your-pabbly-webhook-secret-here
PABBLY_BASE_URL=https://payments.pabbly.com/api/v1

# Product IDs (from Step 3)
PABBLY_BASIC_MONTHLY_PRODUCT_ID=prod_basic_monthly_id
PABBLY_BASIC_YEARLY_PRODUCT_ID=prod_basic_yearly_id
PABBLY_PRO_MONTHLY_PRODUCT_ID=prod_pro_monthly_id
PABBLY_PRO_YEARLY_PRODUCT_ID=prod_pro_yearly_id
PABBLY_ENTERPRISE_MONTHLY_PRODUCT_ID=prod_enterprise_monthly_id
PABBLY_ENTERPRISE_YEARLY_PRODUCT_ID=prod_enterprise_yearly_id
```

### Step 5: Configure Webhooks
In Pabbly dashboard:
- **Webhook URL:** `https://your-domain.com/api/webhooks/pabbly`
- **Events to monitor:**
  - `subscription.created`
  - `subscription.updated`
  - `subscription.cancelled`
  - `payment.succeeded`
  - `payment.failed`
  - `subscription.trial_will_end`

## 🔄 Migration from Stripe (if applicable)

If migrating existing users from Stripe:

1. **Keep old Stripe fields** in database (they're still there for backward compatibility)
2. **Gradual migration:** New subscriptions use Pabbly, old ones continue with Stripe
3. **Data preservation:** Existing subscription data remains intact

## 🎯 API Endpoints

### Customer Management
- `POST /api/pabbly/customers` - Create customer
- `GET /api/pabbly/customers/:id` - Get customer details

### Subscription Management
- `POST /api/pabbly/subscriptions` - Create subscription
- `GET /api/pabbly/subscriptions/:id` - Get subscription
- `POST /api/pabbly/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/pabbly/subscriptions/:id/reactivate` - Reactivate subscription

### Payment Links
- `POST /api/pabbly/payment-links` - Create payment link

## 📊 Billing Flow

1. **User selects plan** → Frontend calls `/api/subscriptions/create`
2. **System creates Pabbly customer** (if doesn't exist)
3. **Subscription created** with 7-day trial
4. **Return payment URL** → User completes payment
5. **Webhook notification** → System updates subscription status
6. **Usage tracking** → Monthly renewal resets reply counts

## 🔔 Webhook Events

### Supported Events:
- `subscription.created` → Creates new subscription record
- `subscription.updated` → Updates subscription details
- `subscription.cancelled` → Marks as cancelled, pending end date
- `payment.succeeded` → Resets usage counters for billing cycle
- `payment.failed` → Sets subscription to past_due status
- `subscription.trial_will_end` → Logs trial expiration

### Webhook Security:
- Signature verification (if provided by Pabbly)
- Duplicate event handling
- Comprehensive error logging

## 💰 Pricing Structure

| Plan | Monthly | Yearly | Replies | Channels | Features |
|------|---------|--------|---------|----------|----------|
| **Basic** | $9.99 | $99 | 100 | 1 | Core AI replies |
| **Pro** | $29.99 | $299 | 500 | 5 | + Analytics, Custom templates |
| **Enterprise** | $99.99 | $999 | 2000 | 25 | + Priority support, API access |

## 🔧 Troubleshooting

### Common Issues:

**"Invalid API Key"**
- Verify PABBLY_API_KEY in .env file
- Ensure your Pabbly account is active

**"Product not found"**
- Check PRODUCT_ID matches exactly from Pabbly dashboard
- Verify products are published and active

**"Webhook signature failed"**
- Confirm PABBLY_WEBHOOK_SECRET is correct
- Check webhook configuration in Pabbly dashboard

**"Customer creation failed"**
- Verify all required fields (email, name)
- Check API rate limits

### Debug Commands:
```bash
# Test subscription creation
curl -X POST http://localhost:5000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"plan":"basic","interval":"month"}'

# Check webhook endpoint
curl -X POST http://localhost:5000/api/webhooks/pabbly \
  -H "Content-Type: application/json" \
  -d '{"type":"subscription.created","data":{...}}'
```

## 🌐 Production Configuration

### Webhook URL:
```
Production: https://your-domain.com/api/webhooks/pabbly
Staging: https://staging.your-domain.com/api/webhooks/pabbly
Development: http://localhost:5000/api/webhooks/pabbly
```

### Environment Variables:
```bash
NODE_ENV=production
PABBLY_BASE_URL=https://payments.pabbly.com/api/v1
PABBLY_WEBHOOK_SECRET=your-production-webhook-secret
```

## 📱 Frontend Integration

### Updated Components:
- **SubscriptionPage** - Uses Pabbly product IDs and pricing
- **Dashboard** - Shows subscription status from Pabbly
- **BillingPage** - Displays invoices from Pabbly
- **PaymentFlow** - Redirects to Pabbly payment URLs

### Sample Frontend Code:
```typescript
// Create subscription
const response = await api.post('/subscriptions/create', {
  plan: 'basic',
  interval: 'month'
});

// Redirect to payment
if (response.data.paymentUrl) {
  window.location.href = response.data.paymentUrl;
}
```

## 🔒 Security Features

- **API Key encryption** (stored securely)
- **Webhook signature verification**
- **Customer data protection**
- **Payment URL expiration**
- **Rate limiting** on payment endpoints

## 📊 Analytics & Reporting

### Subscription Metrics:
- Active subscriptions by plan
- Churn rate calculation
- Revenue tracking
- Payment success/failure rates
- Trial conversion rates

### Integration with App:
- Usage reset on successful payments
- Automatic subscription status updates
- Failed payment notifications
- Billing cycle alignment

## 🚀 Advantages over Stripe

1. **Simplified API** - More straightforward integration
2. **Better trial management** - Built-in trial period handling
3. **Lower fees** - Competitive pricing structure
4. **Indian market focus** - Better support for INR and local payments
5. **Unified dashboard** - Easier product management

## 🔧 Future Enhancements

- **Multi-currency support** (INR, USD, EUR)
- **Tax calculation** automatic
- **Promotional codes** integration
- **Subscription pausing** functionality
- **Payment method management**
- **Invoice customization**

---

## 📞 Support

For Pabbly Payments issues:
- **Pabbly Support:** support@pabbly.com
- **Developer Documentation:** [Pabbly API Docs](https://payments.pabbly.com/docs)

For application-specific support:
- **Contact:** developer@yourcompany.com
- **Documentation:** Check this README for updates