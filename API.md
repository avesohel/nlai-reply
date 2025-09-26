# API Documentation

Complete API reference for the YouTube Reply Service.

## 🌐 Base URL

```
Development: http://localhost:5000/api
Production: https://yourdomain.com/api
```

## 🔐 Authentication

Most endpoints require authentication using JWT tokens in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📋 Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "pagination": {
    "current": 1,
    "total": 10,
    "count": 100
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## 🔑 Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "emailVerified": false
  }
}
```

### Login User

**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "subscription": {
      "plan": "pro",
      "status": "active"
    }
  }
}
```

### Get Current User

**GET** `/auth/me`

Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "subscription": {},
    "usage": {
      "repliesSent": 45,
      "currentPeriodReplies": 23
    }
  }
}
```

### Verify Email

**POST** `/auth/verify-email`

Verify user email address with token.

**Request Body:**
```json
{
  "token": "email-verification-token"
}
```

### Forgot Password

**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### Reset Password

**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

## 👤 User Management Endpoints

### Get User Profile

**GET** `/users/profile`

Get detailed user profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "settings": {
      "emailNotifications": true,
      "replyDelay": 60,
      "maxRepliesPerHour": 10
    },
    "youtubeChannels": [
      {
        "channelId": "UCxxxxxxxxxxxxx",
        "channelName": "My Channel",
        "connected": true
      }
    ]
  }
}
```

### Update User Profile

**PUT** `/users/profile`

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Updated",
  "settings": {
    "emailNotifications": false,
    "replyDelay": 120
  }
}
```

### Change Password

**PUT** `/users/change-password`

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Get User Analytics

**GET** `/users/analytics`

Get user analytics and statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` - Analytics period in days (default: 30)

**Response:**
```json
{
  "success": true,
  "stats": {
    "sent": 45,
    "failed": 2,
    "pending": 0
  },
  "totalReplies": 47,
  "remainingReplies": 453,
  "recentReplies": [
    {
      "id": "reply-id",
      "videoTitle": "My Video",
      "status": "sent",
      "sentAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Usage Statistics

**GET** `/users/usage`

Get current usage and limits.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "hasSubscription": true,
  "subscription": {
    "plan": "pro",
    "status": "active",
    "currentPeriodEnd": "2024-02-15T00:00:00Z"
  },
  "usage": {
    "repliesSent": 156,
    "currentPeriodReplies": 45
  },
  "limits": {
    "repliesPerMonth": 500
  },
  "remainingReplies": 455
}
```

## 💳 Subscription Management

### Get Available Plans

**GET** `/subscriptions/plans`

Get all available subscription plans.

**Response:**
```json
{
  "success": true,
  "plans": {
    "basic": {
      "name": "Basic",
      "price": {
        "monthly": 9.99,
        "yearly": 99
      },
      "features": {
        "repliesPerMonth": 100,
        "channels": 1,
        "prioritySupport": false
      }
    },
    "pro": {
      "name": "Pro",
      "price": {
        "monthly": 29.99,
        "yearly": 299
      },
      "features": {
        "repliesPerMonth": 500,
        "channels": 5,
        "prioritySupport": true
      }
    }
  }
}
```

### Create Subscription

**POST** `/subscriptions/create`

Create a new subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan": "pro",
  "interval": "month"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "subscription": {
    "id": "sub_xxxxxxxxxxxxx",
    "plan": "pro",
    "status": "active"
  },
  "clientSecret": "pi_xxxxxxxxxxxxx_secret_xxxxxxxxxxxxx"
}
```

### Get Subscription Status

**GET** `/subscriptions/status`

Get current subscription status.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "hasSubscription": true,
  "subscription": {
    "id": "sub_xxxxxxxxxxxxx",
    "plan": "pro",
    "status": "active",
    "currentPeriodStart": "2024-01-15T00:00:00Z",
    "currentPeriodEnd": "2024-02-15T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "features": {
      "repliesPerMonth": 500,
      "channels": 5
    }
  },
  "usage": {
    "current": 45,
    "limit": 500,
    "remaining": 455
  }
}
```

### Cancel Subscription

**POST** `/subscriptions/cancel`

Cancel current subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the current period",
  "subscription": {
    "status": "active",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2024-02-15T00:00:00Z"
  }
}
```

## 📺 YouTube Integration

### Get YouTube Auth URL

**GET** `/youtube/auth-url`

Get YouTube OAuth authorization URL.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/oauth/authorize?client_id=..."
}
```

### Connect YouTube Channel

**POST** `/youtube/connect`

Connect YouTube channel using OAuth code.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": "oauth-authorization-code"
}
```

**Response:**
```json
{
  "success": true,
  "message": "YouTube channel connected successfully",
  "channel": {
    "channelId": "UCxxxxxxxxxxxxx",
    "channelName": "My Channel",
    "thumbnailUrl": "https://..."
  }
}
```

### Get Connected Channels

**GET** `/youtube/channels`

Get list of connected YouTube channels.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "channels": [
    {
      "channelId": "UCxxxxxxxxxxxxx",
      "channelName": "My Channel",
      "connected": true,
      "lastSync": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Disconnect YouTube Channel

**DELETE** `/youtube/disconnect/:channelId`

Disconnect a YouTube channel.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "YouTube channel disconnected successfully"
}
```

### Get Video Comments

**GET** `/youtube/videos/:channelId/comments`

Get comments for a specific video.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `videoId` - YouTube video ID (required)
- `maxResults` - Maximum results to return (default: 10)

**Response:**
```json
{
  "success": true,
  "comments": [
    {
      "id": "comment-id",
      "text": "Great video!",
      "author": "User Name",
      "likeCount": 5,
      "publishedAt": "2024-01-15T10:30:00Z",
      "canReply": true
    }
  ]
}
```

### Reply to Comment

**POST** `/youtube/reply`

Send a reply to a YouTube comment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "channelId": "UCxxxxxxxxxxxxx",
  "videoId": "video-id",
  "commentId": "comment-id",
  "replyText": "Thank you for your comment!",
  "templateId": "optional-template-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply sent successfully",
  "replyId": "reply-id",
  "remainingReplies": 499
}
```

## 📝 Reply Templates

### Get Reply Templates

**GET** `/youtube/templates`

Get user's reply templates.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "template-id",
      "name": "Thank You Template",
      "content": "Thank you {{username}} for your comment!",
      "triggers": ["thanks", "thank you"],
      "conditions": {
        "sentiment": "positive"
      },
      "isActive": true,
      "usageCount": 45
    }
  ]
}
```

### Create Reply Template

**POST** `/youtube/templates`

Create a new reply template.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Welcome Template",
  "content": "Welcome {{username}} to my channel! Thanks for subscribing!",
  "triggers": ["subscribe", "new subscriber"],
  "conditions": {
    "sentiment": "positive",
    "keywords": ["subscribe", "new"]
  },
  "variables": [
    {
      "name": "username",
      "defaultValue": "there",
      "required": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply template created successfully",
  "template": {
    "id": "template-id",
    "name": "Welcome Template",
    "content": "Welcome {{username}} to my channel!",
    "isActive": true
  }
}
```

### Update Reply Template

**PUT** `/youtube/templates/:id`

Update an existing reply template.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "content": "Updated content {{username}}!",
  "isActive": false
}
```

### Delete Reply Template

**DELETE** `/youtube/templates/:id`

Delete a reply template.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

## 🤖 AI Features

### Get AI Settings

**GET** `/ai/settings`

Get user's AI reply configuration.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "settings": {
    "isEnabled": true,
    "replyTone": "friendly",
    "replyLength": "medium",
    "personalityTraits": {
      "enthusiasmLevel": 7,
      "formalityLevel": 5,
      "humorLevel": 3,
      "helpfulnessLevel": 9
    },
    "customInstructions": "Be helpful and engaging",
    "aiModel": "gpt-3.5-turbo",
    "usage": {
      "totalRepliesGenerated": 156,
      "currentMonthUsage": 45
    }
  }
}
```

### Update AI Settings

**PUT** `/ai/settings`

Update AI reply configuration.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "isEnabled": true,
  "replyTone": "professional",
  "replyLength": "short",
  "personalityTraits": {
    "enthusiasmLevel": 8,
    "formalityLevel": 7
  },
  "customInstructions": "Always be professional and helpful"
}
```

### Generate AI Reply

**POST** `/ai/generate-reply`

Generate an AI-powered reply for a comment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "comment": {
    "id": "comment-123",
    "text": "Great video! How did you learn this?",
    "author": "John Doe",
    "likeCount": 5
  },
  "videoId": "video-123",
  "channelId": "channel-123",
  "options": {
    "forceRegenerate": false,
    "saveToLog": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Thanks John! I learned this through lots of practice and research. Check out the resources in my description for more details! 😊",
  "confidence": 0.92,
  "analysis": {
    "hasQuestion": true,
    "sentiment": "positive",
    "category": "question"
  },
  "context": {
    "videoTitle": "My Tutorial Video",
    "relevantContent": true,
    "tokensUsed": 145,
    "responseTime": 1250
  }
}
```

### Extract Video Transcript

**POST** `/ai/transcripts/extract`

Extract and process video transcript for AI context.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "videoId": "video-123",
  "channelId": "channel-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcript extracted successfully",
  "transcript": {
    "videoId": "video-123",
    "videoTitle": "My Tutorial Video",
    "summary": "This video covers basic programming concepts...",
    "keyTopics": ["programming", "tutorial", "beginners"],
    "wordCount": 1250,
    "isProcessed": true
  },
  "cached": false
}
```

### Get AI Analytics

**GET** `/ai/analytics`

Get AI usage statistics and performance metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "analytics": {
    "ai": {
      "totalRepliesGenerated": 156,
      "currentMonthUsage": 45,
      "successRate": 94,
      "averageResponseTime": 1450,
      "recentActivity": [
        {
          "videoTitle": "My Video",
          "reply": "Thanks for watching!",
          "confidence": 0.89,
          "createdAt": "2024-01-15T10:30:00Z"
        }
      ]
    },
    "transcripts": {
      "total": 25,
      "processed": 23,
      "failed": 2,
      "totalWordCount": 45000
    }
  }
}
```

## 📊 Reply History

### Get Reply History

**GET** `/youtube/replies`

Get user's reply history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)
- `status` - Filter by status (sent, failed, pending)
- `channelId` - Filter by channel

**Response:**
```json
{
  "success": true,
  "replies": [
    {
      "id": "reply-id",
      "videoTitle": "My Video",
      "channelName": "My Channel",
      "originalComment": {
        "text": "Great video!",
        "author": "User Name"
      },
      "replyContent": "Thank you!",
      "status": "sent",
      "sentAt": "2024-01-15T10:30:00Z",
      "template": {
        "name": "Thank You Template"
      },
      "aiGenerated": true,
      "confidence": 0.89
    }
  ],
  "pagination": {
    "current": 1,
    "total": 5,
    "count": 47
  }
}
```

## 🔔 Webhooks

### Stripe Webhook

**POST** `/webhooks/stripe`

Handle Stripe webhook events for subscription management.

**Headers:**
- `stripe-signature` - Stripe webhook signature

**Request Body:** Raw Stripe webhook payload

## 📈 Health Check

### Health Check

**GET** `/health`

Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

## ❌ Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## 🔄 Rate Limiting

API endpoints are rate limited to prevent abuse:

- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- YouTube API endpoints: 50 requests per hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234800
```

## 🧪 Testing

### Postman Collection

Import the provided Postman collection for easy API testing:

```json
{
  "info": {
    "name": "YouTube Reply Service API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

### Example cURL Commands

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get user profile (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer TOKEN"
```

---

**Author:** Ali Sohel (avesohel@gmail.com)

For more examples and detailed guides, see the [README](README.md) file.