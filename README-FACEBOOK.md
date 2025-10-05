# Facebook Comments Reply Integration

This document explains how to set up and use the Facebook comments reply functionality in NL AI Reply.

## 🚀 Features

- Connect Facebook Pages to your account
- Automatically reply to comments on posts, photos, and videos
- API-compatible with existing reply templates and analytics
- Hybrid architecture (separate from YouTube but shared templates/analytics)

## ⚠️ Important Limitations

### Meta Business API Constraints:

1. **Page Ownership Required**: Can only manage comments on pages you own/administer
2. **Comment Access**: Limited to posts/photos/videos on connected pages
3. **No Real-time Webhooks**: Cannot monitor new comments in real-time like YouTube
4. **Rate Limits**: Stricter limits compared to YouTube API
5. **Permissions**: Requires specific Meta app review for production
6. **Personal Profiles**: Cannot access personal profile comments (only business pages)

### Technical Limitations:

- No real-time comment notifications
- 60-day token expiry (vs. refreshable YouTube tokens)
- API responses may be delayed compared to YouTube
- Cannot reply to personal profile posts

## 🛠️ Setup Instructions

### Step 1: Create Meta Business Account
1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a Business Manager account
3. Verify your identity and link your Facebook pages

### Step 2: Meta Developer App Setup
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create new app → Business App
3. Add Facebook Login product
4. Configure OAuth redirect URIs:

```
Production: https://your-domain.com/api/facebook/callback
Development: http://localhost:5000/api/facebook/callback
```

### Step 3: App Review (Critical)
Request approval for these permissions:
- `pages_manage_metadata` - Manage page metadata
- `pages_read_engagement` - Read page content and engagement
- `pages_manage_posts` - Manage page posts and replies

**⚠️ WARNING**: Without approved permissions, the app will only work in development mode.

### Step 4: Environment Variables
Add to your `.env` file:

```bash
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=https://your-domain.com/api/facebook/callback
```

### Step 5: Test the Integration
1. Connect your Facebook Page in the dashboard
2. Test comment fetching from a recent post
3. Send a test reply using an existing template

## 🔄 How It Works

### Authentication Flow:
```
User clicks "Connect Facebook" → Meta OAuth → Page selection → Token exchange → Done
```

### Comment Reply Process:
1. **Comment Discovery**: API fetches comments from connected page posts every 30-60 minutes
2. **Reply Trigger**: Manual selection or automated templating (if implemented)
3. **Reply Posting**: Direct API call to Facebook Graph API
4. **Logging**: All replies logged to analytics (platform: 'facebook')

### Token Management:
- User tokens expire in 60 days
- Page tokens also expire and need refresh
- Disconnect/reconnect required for expired tokens

## 🐛 Troubleshooting

### Common Issues:

**"No pages available"**
- Ensure you're a page admin
- Your page might be restricted by Meta

**"Permission denied"**
- App not reviewed for production
- Missing required scopes

**"Token expired"**
- Need to reconnect the page every 60 days

**"Comments not loading"**
- Check if the post has comments enabled
- Some post types don't support comments

### Debug Commands:
```bash
# Check Facebook API endpoints
curl http://localhost:5000/api/facebook/auth-url -H "Authorization: Bearer YOUR_TOKEN"

# List connected pages
curl http://localhost:5000/api/facebook/pages -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Analytics & Reporting

Facebook replies are included in:
- Total reply counts
- Reply logs (marked with platform: 'facebook')
- Analytics dashboard (shared with YouTube)

## 🔒 Security & Privacy

- Page access tokens encrypted at rest
- Token scopes limited to comment management only
- No access to user personal data
- All API calls authenticated and logged

## 🚀 Future Enhancements

Potential improvements (not yet implemented):
- Real-time comment monitoring
- Auto-reply based on comments
- Advanced analytics for Facebook vs YouTube
- Multi-page reply strategies
- Comment sentiment analysis

## 📱 Mobile & Apps

Currently web-only. Facebook integration works the same across devices.

## 💰 Cost Implications

- Meta Business API: Free for approved apps
- No additional server costs beyond existing infrastructure
- Same subscription model applies to Facebook replies

## 🆘 Support

If you encounter issues:
1. Check Meta Business Manager for account status
2. Verify app permissions in Developer Console
3. Review server logs for API errors
4. Test with Facebook's Graph API Explorer

Contact: developer@yourcompany.com