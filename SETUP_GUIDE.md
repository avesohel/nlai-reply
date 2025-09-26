# 🚀 Complete Setup Guide

Follow these steps to set up and run the YouTube Reply Service locally.

## 📋 Prerequisites

### Required Software

- **Node.js 16+** and npm 8+ ([Download](https://nodejs.org/))
- **MongoDB 5+** ([Download](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account
- **Git** ([Download](https://git-scm.com/downloads))
- **VS Code** ([Download](https://code.visualstudio.com/)) - Recommended

### Required API Keys and Services

#### 1. YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key and OAuth 2.0 Client ID)
5. Set authorized redirect URIs: `http://localhost:5000/auth/youtube/callback`

#### 2. OpenAI API (for AI features)

1. Sign up at [OpenAI](https://platform.openai.com/)
2. Get API key from [API Keys section](https://platform.openai.com/api-keys)
3. Ensure you have credits/billing set up

#### 3. Pinecone Vector Database (for AI features)

1. Sign up at [Pinecone](https://www.pinecone.io/)
2. Create a new index named `youtube-transcripts`
3. Use dimensions: `1536` (for OpenAI embeddings)
4. Get API key and environment name

#### 4. Stripe (for payments)

1. Sign up at [Stripe](https://stripe.com/)
2. Get publishable and secret keys from dashboard
3. Set up webhook endpoint for subscription events

#### 5. SMTP Email Service

- **Gmail**: Use app passwords
- **SendGrid**: Get API key
- **AWS SES**: Configure credentials

## 🛠️ Setup Instructions

### Step 1: Clone and Open in VS Code

```bash
# Clone the repository
git clone <your-repo-url>
cd nlai-reply

# Open in VS Code
code .
```

### Step 2: Install VS Code Extensions

When you open the project, VS Code will recommend extensions. Install:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- REST Client
- MongoDB for VS Code

### Step 3: Run Setup Script

```bash
# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

### Step 4: Configure Environment Variables

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/nlai-reply
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nlai-reply

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRE=7d

# YouTube API
YOUTUBE_API_KEY=AIzaSyC...your-api-key
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:5000/auth/youtube/callback

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# AI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=150

# Vector Database (Pinecone)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=youtube-transcripts

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### Step 5: Start MongoDB

```bash
# macOS with Homebrew
brew services start mongodb/brew/mongodb-community

# Linux with systemd
sudo systemctl start mongod

# Windows - run MongoDB as a service
# Or use MongoDB Atlas (cloud)
```

### Step 6: Seed Database

```bash
npm run seed
```

This creates:

- Admin user: `admin@replybot.com` / `admin123`
- Test user: `test@replybot.com` / `user123`
- Sample reply templates
- Test subscription data

### Step 7: Start Development Servers

Option 1: Start both frontend and backend together

```bash
npm run dev
```

Option 2: Start separately

```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🧪 Testing the Application

### 1. Test Basic Functionality

1. Open http://localhost:3000
2. Register a new account or use test credentials:
   - Email: `test@replybot.com`
   - Password: `user123`

### 2. Test YouTube Integration

1. Go to Dashboard
2. Click "Connect YouTube Channel"
3. Complete OAuth flow (requires real Google account)

### 3. Test AI Features

1. Go to AI Settings page
2. Configure AI preferences
3. Use "Test AI Reply" with sample comments
4. Try extracting transcript from a real YouTube video

### 4. Test API Endpoints

Use the `test-endpoints.http` file in VS Code with REST Client extension:

1. Install REST Client extension
2. Open `test-endpoints.http`
3. Update `@authToken` with a real JWT token
4. Run individual requests by clicking "Send Request"

### 5. Run Automated Tests

```bash
npm test
```

## 🐳 Docker Development (Alternative)

If you prefer using Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 VS Code Debugging

### Debug Backend

1. Press `F5` or go to Run & Debug
2. Select "Launch Server"
3. Set breakpoints in your code
4. Debug requests

### Debug Tests

1. Go to Run & Debug
2. Select "Debug Tests"
3. Set breakpoints in test files

## 📊 Monitoring and Logs

### View Application Logs

```bash
# Backend logs
tail -f logs/combined.log

# MongoDB logs (macOS)
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Health Checks

- API: http://localhost:5000/api/health
- Database: Check MongoDB connection in logs
- Frontend: Check browser console for errors

## 🚨 Common Issues and Solutions

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
brew services start mongodb/brew/mongodb-community  # macOS
sudo systemctl start mongod                         # Linux
```

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### OpenAI API Errors

- Check API key is valid
- Ensure you have credits/billing set up
- Check rate limits

### YouTube API Errors

- Verify API key and OAuth credentials
- Check quota limits in Google Cloud Console
- Ensure YouTube Data API v3 is enabled

### Pinecone Connection Issues

- Verify API key and environment
- Ensure index exists with correct dimensions (1536)
- Check region/environment settings

## 🎯 Next Steps

Once everything is running:

1. **Set up Stripe Webhooks**:

   - Add webhook endpoint: `http://localhost:5000/api/webhooks/stripe`
   - Select events: `customer.subscription.*`, `invoice.*`

2. **Test AI Features**:

   - Extract transcript from a real YouTube video
   - Generate AI replies for sample comments
   - Configure personality settings

3. **Production Deployment**:

   - Use the deployment guide in `DEPLOYMENT.md`
   - Set up production environment variables
   - Configure domain and SSL certificates

4. **GitHub Actions**:
   - Push code to GitHub repository
   - Set up repository secrets for CI/CD
   - Configure deployment environments

## 🆘 Need Help?

- Check logs in `logs/` directory
- Use VS Code debugger for step-by-step debugging
- Test API endpoints with `test-endpoints.http`
- Review error messages in browser console
- Check MongoDB connection and data

Happy coding! 🎉

---

**Created by Ali Sohel (avesohel@gmail.com)**
