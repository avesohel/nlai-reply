# YouTube Reply Service MVP

A subscription-based SaaS platform that automates YouTube comment replies using AI-powered templates and smart automation.

## 🌟 Features

### Core Features

- **Smart Reply Templates**: Create custom reply templates with variables and conditions
- **YouTube Integration**: Direct integration with YouTube API for seamless comment management
- **Subscription Management**: Tiered subscription plans with Stripe integration
- **Analytics Dashboard**: Track reply performance and engagement metrics
- **Multi-Channel Support**: Manage multiple YouTube channels from a single dashboard
- **Real-time Automation**: Automated comment monitoring and response system
- **Secure Authentication**: JWT-based authentication with email verification

### 🤖 AI-Powered Features

- **Natural AI Replies**: Generate human-like responses using OpenAI GPT models
- **Video Context Understanding**: Extract and analyze YouTube video transcripts for contextual replies
- **Vector-Based Content Matching**: Use Pinecone vector database for intelligent content similarity
- **Sentiment Analysis**: Analyze comment sentiment and filter responses accordingly
- **Personality Customization**: Configure AI tone, formality, humor, and enthusiasm levels
- **Smart Reply Filtering**: Advanced filters for spam detection and quality control
- **Multilingual Support**: Generate replies in multiple languages with proper context
- **Real-time Learning**: AI improves responses based on video content and user feedback

## 🏗️ Tech Stack

### Backend

- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Stripe** for payment processing
- **YouTube Data API v3** for YouTube integration
- **Nodemailer** for email services
- **Cron jobs** for background tasks

### AI & Machine Learning

- **OpenAI GPT-4/3.5** for natural language generation
- **Pinecone Vector Database** for semantic search and content matching
- **YouTube Transcript API** for video content extraction
- **Natural Language Processing** for sentiment analysis and keyword extraction
- **TikToken** for token counting and optimization

### Frontend

- **React 18** with modern hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Hook Form** for form handling
- **Lucide React** for icons

### DevOps & Deployment

- **Docker** containerization
- **Docker Compose** for development
- **Nginx** reverse proxy
- **Environment-based configuration**

## 📋 Prerequisites

### Required Services

- Node.js 16+ and npm 8+
- MongoDB 5+
- YouTube Data API credentials
- Stripe account for payments
- SMTP server for emails

### AI Services (Required for AI Features)

- **OpenAI API Account** with GPT-4 or GPT-3.5 access
- **Pinecone Vector Database** account and API key
- Sufficient API quotas for expected usage volume

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nlai-reply
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/nlai-reply

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:5000/auth/youtube/callback

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### 4. Database Setup

```bash
# Make sure MongoDB is running, then seed the database
npm run seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend development server
npm run client
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🎯 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/usage` - Get usage statistics
- `GET /api/users/analytics` - Get user analytics

### Subscriptions

- `GET /api/subscriptions/plans` - Get available plans
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/status` - Get subscription status

### YouTube Integration

- `GET /api/youtube/auth-url` - Get YouTube OAuth URL
- `POST /api/youtube/connect` - Connect YouTube channel
- `GET /api/youtube/channels` - Get connected channels
- `GET /api/youtube/videos/:channelId/comments` - Get video comments
- `POST /api/youtube/reply` - Send reply to comment

### Reply Templates

- `GET /api/youtube/templates` - Get reply templates
- `POST /api/youtube/templates` - Create reply template
- `PUT /api/youtube/templates/:id` - Update template
- `DELETE /api/youtube/templates/:id` - Delete template

## 📊 Subscription Plans

### Basic Plan - $9.99/month

- 100 replies per month
- 1 YouTube channel
- Basic reply templates
- Email support

### Pro Plan - $29.99/month

- 500 replies per month
- 5 YouTube channels
- Advanced templates with variables
- Priority support
- Analytics dashboard

### Enterprise Plan - $99.99/month

- 2000 replies per month
- 25 YouTube channels
- Custom templates
- Premium support
- Advanced analytics
- White-label options

## 🔧 Development

### Project Structure

```
nlai-reply
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utilities
│   └── public/
├── config/                # Configuration files
├── middleware/            # Express middleware
├── models/               # Mongoose models
├── routes/               # API routes
├── services/             # Business logic services
├── scripts/              # Database seeds and utilities
└── server.js             # Main server file
```

### Available Scripts

```bash
# Development
npm run dev          # Start both client and server
npm run server       # Start backend only
npm run client       # Start frontend only

# Production
npm start           # Start production server
npm run build       # Build for production

# Database
npm run seed        # Seed database with sample data

# Testing
npm test           # Run tests
npm run lint       # Run ESLint
```

### Database Models

#### User Model

- Authentication and profile information
- YouTube channel connections
- Usage tracking and limits
- Subscription relationship

#### Subscription Model

- Subscription plans and status
- Stripe integration
- Feature access control
- Billing information

#### Reply Template Model

- Custom reply templates
- Conditional logic and triggers
- Variable substitution
- Usage analytics

#### Reply Log Model

- Historical reply tracking
- Performance metrics
- Error logging
- Audit trail

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: BCrypt with salt rounds
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Joi schema validation
- **CORS Configuration**: Cross-origin request security
- **Helmet Integration**: Security headers
- **Environment Variables**: Sensitive data protection

## 🌐 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Set up production environment variables
2. Build the React frontend: `cd client && npm run build`
3. Start the production server: `npm start`
4. Configure reverse proxy (Nginx recommended)
5. Set up SSL certificates
6. Configure monitoring and logging

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=https://yourdomain.com
```

## 📈 Monitoring and Analytics

The application includes built-in monitoring for:

- User registration and engagement
- Subscription metrics
- API usage and performance
- Error tracking and logging
- Revenue analytics

## 🔄 Background Jobs

Automated cron jobs handle:

- Usage limit notifications
- Subscription renewal reminders
- Database cleanup
- Monthly analytics reports
- Email notifications

## 🧪 Testing

### Test Login Credentials

After seeding the database:

- **Admin**: admin@replybot.com / admin123
- **User**: test@replybot.com / user123

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@replybot.com","password":"user123"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:

- Email: avesohel@gmail.com
- Author: Ali Sohel
- Issues: Create a GitHub issue

## 🚧 Roadmap

### Phase 1 (Current)

- ✅ Basic MVP functionality
- ✅ YouTube integration
- ✅ Subscription management
- ✅ Reply templates

### Phase 2 (Next)

- AI-powered reply suggestions
- Sentiment analysis
- Advanced analytics
- Mobile app

### Phase 3 (Future)

- Multi-platform support (TikTok, Instagram)
- Team collaboration features
- Advanced automation rules
- White-label solutions

---

Built with ❤️ by Ali Sohel for content creators worldwide.
