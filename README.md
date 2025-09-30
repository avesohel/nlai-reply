# 🤖 NL AI Reply - Intelligent YouTube Comment Response System

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)

A professional SaaS platform that leverages AI to automatically generate and send intelligent replies to YouTube comments. Built with TypeScript for enhanced type safety and maintainability.

## 🌟 Features

### 🎯 Core Functionality
- **AI-Powered Responses**: Generate contextual, intelligent replies using OpenAI GPT models
- **YouTube Integration**: Seamless connection with YouTube API for comment monitoring and replies
- **Template Management**: Create and manage customizable reply templates
- **Sentiment Analysis**: Analyze comment sentiment before generating appropriate responses
- **Real-time Analytics**: Track engagement, performance metrics, and response effectiveness

### 🔐 Security & Authentication
- **JWT Authentication**: Secure user authentication and authorization
- **Role-based Access Control**: Admin and user role management
- **Email Verification**: Secure account verification system
- **Password Reset**: Secure password recovery flow

### 💰 Subscription Management
- **Stripe Integration**: Secure payment processing
- **Multiple Plans**: Basic, Pro, and Enterprise subscription tiers
- **Usage Tracking**: Monitor API usage and enforce limits
- **Automatic Billing**: Recurring subscription management

### 📊 Analytics & Monitoring
- **Performance Metrics**: Track reply success rates, engagement, and response times
- **Channel Analytics**: Monitor performance across different YouTube channels
- **Template Performance**: Analyze which templates perform best
- **Time-series Data**: Detailed analytics with customizable time ranges

### ⚙️ Advanced Configuration
- **AI Settings**: Customize response tone, length, and personality traits
- **Channel-specific Settings**: Different configurations per YouTube channel
- **Content Filtering**: Exclude spam, set minimum sentiment scores
- **Automatic Replies**: Set up automated response systems

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- MongoDB 5.0+
- YouTube API credentials
- OpenAI API key
- Stripe account (for payments)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nlai-reply.git
   cd nlai-reply
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/nlai-reply

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d

   # YouTube API
   YOUTUBE_CLIENT_ID=your-youtube-client-id
   YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
   YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

   # OpenAI
   OPENAI_API_KEY=your-openai-api-key

   # Stripe
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

   # Email (Optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password

   # Client
   CLIENT_URL=http://localhost:3000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## 🏗️ Architecture

### Backend (TypeScript + Node.js)
```
src/
├── models/           # Mongoose models with TypeScript interfaces
├── routes/           # Express routes with type definitions
├── services/         # Business logic and external API integrations
├── middleware/       # Authentication, validation, error handling
├── config/           # Database and application configuration
└── types/            # TypeScript type definitions
```

### Frontend (React + TypeScript)
```
client/src/
├── components/       # Reusable React components
├── pages/           # Application pages
├── contexts/        # React contexts for state management
├── hooks/           # Custom React hooks
├── utils/           # Utility functions and API calls
└── types/           # TypeScript interfaces
```

### Key Technologies
- **Backend**: Node.js, Express.js, TypeScript, MongoDB, Mongoose
- **Frontend**: React, TypeScript, Tailwind CSS, React Query
- **Authentication**: JWT, bcrypt
- **AI/ML**: OpenAI GPT, Sentiment Analysis
- **Payments**: Stripe
- **APIs**: YouTube Data API v3, Google OAuth2

## 📖 API Documentation

### Authentication Endpoints
```typescript
POST /api/auth/register     // User registration
POST /api/auth/login        // User login
GET  /api/auth/me          // Get current user
POST /api/auth/logout      // Logout user
POST /api/auth/verify-email // Verify email address
```

### Core Endpoints
```typescript
GET    /api/users/profile           // Get user profile
PUT    /api/users/profile           // Update user profile
GET    /api/youtube/channels        // Get user's YouTube channels
GET    /api/youtube/videos/:channelId // Get channel videos
POST   /api/ai/generate-reply       // Generate AI reply
GET    /api/templates               // Get reply templates
POST   /api/templates               // Create reply template
GET    /api/analytics/stats         // Get analytics data
```

## 🔧 Development

### TypeScript Build
```bash
npm run build:server    # Build TypeScript to JavaScript
npm run type-check      # Type checking without build
```

### Testing
```bash
npm test               # Run test suite
npm run test:watch     # Run tests in watch mode
```

### Code Quality
```bash
npm run lint           # Lint TypeScript/JavaScript code
npm run lint:fix       # Fix linting issues
```

### Database
```bash
npm run seed           # Seed database with sample data
```

## 🚀 Deployment

### Production Build
```bash
npm run build          # Build both server and client
npm start             # Start production server
```

### Environment Variables (Production)
Ensure all environment variables are set for production:
- Set `NODE_ENV=production`
- Use production MongoDB URI
- Use production API keys
- Set secure JWT secret
- Configure proper CORS origins

### Deployment Platforms

#### Railway (Recommended for Free Tier)
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

#### Heroku
```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your-production-mongodb-uri
# Set other environment variables
git push heroku main
```

#### Docker
```bash
docker build -t nlai-reply .
docker run -p 5000:5000 nlai-reply
```

## 📊 Monitoring & Analytics

### Health Checks
- `/api/health` - Application health status
- Built-in error logging and monitoring
- Performance metrics tracking

### Analytics Dashboard
- User engagement metrics
- Reply success rates
- Template performance analysis
- Revenue analytics (subscription metrics)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation for API changes
- Follow semantic commit conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@nlai-reply.com
- 📖 Documentation: [docs.nlai-reply.com](https://docs.nlai-reply.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/nlai-reply/issues)

## 🙏 Acknowledgments

- OpenAI for GPT API
- YouTube Data API
- Stripe for payment processing
- MongoDB for database
- All open source contributors

---

**Built with ❤️ by the NL AI Reply Team**