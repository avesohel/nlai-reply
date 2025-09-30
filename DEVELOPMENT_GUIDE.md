# 🛠️ Development Guide

This guide provides comprehensive instructions for setting up, developing, testing, and deploying the NL AI Reply application.

## 📋 Table of Contents

1. [Environment Setup](#environment-setup)
2. [Development Workflow](#development-workflow)
3. [TypeScript Migration](#typescript-migration)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Process](#deployment-process)
6. [Troubleshooting](#troubleshooting)

## 🔧 Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js**: Version 16+ ([Download](https://nodejs.org/))
- **npm**: Version 8+ (comes with Node.js)
- **MongoDB**: Version 5.0+ ([Installation Guide](https://docs.mongodb.com/manual/installation/))
- **Git**: Latest version ([Download](https://git-scm.com/))

### Required API Keys

Before starting development, you'll need:

1. **YouTube Data API v3 Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Set authorized redirect URIs

2. **OpenAI API Key**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Generate API key from dashboard
   - Note: This will incur usage costs

3. **Stripe Account** (for payments)
   - Create account at [Stripe](https://stripe.com/)
   - Get test API keys from dashboard
   - Set up webhook endpoints

### Local Development Setup

#### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-username/nlai-reply.git
cd nlai-reply

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

#### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nlai-reply
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRE=7d

# YouTube API Configuration
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Configuration (Optional - for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-development-email@gmail.com
SMTP_PASS=your-app-specific-password

# Application URLs
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
```

#### 3. Database Setup

```bash
# Start MongoDB (if using local installation)
sudo systemctl start mongod

# Or using MongoDB Docker container
docker run --name mongodb -d -p 27017:27017 mongo:6.0

# Verify connection
npm run db:test
```

#### 4. Development Server

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start them separately:
# Terminal 1 - Backend (TypeScript with hot reload)
npm run server:dev

# Terminal 2 - Frontend (React development server)
npm run client
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🔄 Development Workflow

### TypeScript Development

The project uses TypeScript for enhanced type safety and maintainability:

```bash
# Type checking without compilation
npm run type-check

# Build TypeScript to JavaScript
npm run build:server

# Development with hot reload
npm run server:dev
```

### Code Quality

```bash
# Lint all TypeScript/JavaScript files
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Run all quality checks
npm run quality:check
```

### Git Workflow

1. **Feature Development**
   ```bash
   # Create feature branch from develop
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name

   # Make changes and commit
   git add .
   git commit -m "feat: add your feature description"

   # Push and create PR
   git push origin feature/your-feature-name
   ```

2. **Commit Message Convention**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/modifications
   - `chore:` - Maintenance tasks

### Database Operations

```bash
# Seed database with sample data
npm run seed

# Reset database (development only)
npm run db:reset

# Run database migrations
npm run db:migrate

# Backup database
npm run db:backup
```

## 🧪 Testing Strategy

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

### Integration Tests

```bash
# Run API integration tests
npm run test:integration

# Test with real database
npm run test:db
```

### Frontend Testing

```bash
cd client

# Run React component tests
npm test

# Run tests with coverage
npm test -- --coverage --watchAll=false

# E2E tests with Playwright
npm run test:e2e
```

### Test Database Setup

Create a separate test database:

```bash
# Set test environment
export NODE_ENV=test
export MONGODB_URI=mongodb://localhost:27017/nlai-reply-test

# Run tests
npm test
```

## 🚀 Deployment Process

### Environment Preparation

#### Staging Environment

1. **Infrastructure Setup**
   ```bash
   # Deploy to Railway (recommended for staging)
   npm install -g @railway/cli
   railway login
   railway init
   railway add --service postgresql
   railway add --service redis
   ```

2. **Environment Variables**
   Set all production-like environment variables in Railway dashboard:
   - Database connection strings
   - API keys (use test keys for staging)
   - Authentication secrets
   - CORS origins

#### Production Environment

1. **Security Checklist**
   - [ ] Strong JWT secret (minimum 32 characters)
   - [ ] Production database with authentication
   - [ ] HTTPS enabled with valid SSL certificate
   - [ ] API rate limiting configured
   - [ ] Environment variables secured
   - [ ] Production API keys configured
   - [ ] Error logging and monitoring setup

2. **Performance Optimization**
   ```bash
   # Build optimized version
   npm run build

   # Analyze bundle size
   npm run analyze

   # Test production build locally
   npm run start:prod
   ```

### Deployment Commands

#### Build Process

```bash
# Full production build
npm run build

# Build server only
npm run build:server

# Build client only
cd client && npm run build
```

#### Deployment Platforms

##### Railway (Recommended)
```bash
# Connect to Railway
railway login

# Deploy to staging
railway up --service staging-nlai-reply

# Deploy to production
railway up --service production-nlai-reply
```

##### Heroku
```bash
# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-production-db-uri
# ... set other variables

# Deploy
git push heroku main
```

##### Docker Deployment
```bash
# Build Docker image
docker build -t nlai-reply .

# Run container
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=your-db-uri \
  nlai-reply

# Docker Compose (recommended)
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The project includes GitHub Actions for automated testing and deployment:

1. **Continuous Integration**
   - Linting and type checking
   - Unit and integration tests
   - Security audit
   - Build verification

2. **Continuous Deployment**
   - Automatic staging deployment on `develop` branch
   - Manual production deployment on `main` branch
   - Health checks and rollback capabilities

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection string
echo $MONGODB_URI
```

#### 2. TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf dist/
rm -rf node_modules/.cache/

# Reinstall dependencies
rm -rf node_modules/
npm install

# Check TypeScript configuration
npx tsc --showConfig
```

#### 3. API Rate Limiting
```bash
# Increase rate limits for development
export RATE_LIMIT_MAX_REQUESTS=1000
export RATE_LIMIT_WINDOW_MS=60000
```

#### 4. YouTube API Issues
- Verify API key is valid and has YouTube Data API enabled
- Check quota limits in Google Cloud Console
- Ensure OAuth redirect URIs are correctly configured

#### 5. Frontend Build Issues
```bash
cd client

# Clear React cache
rm -rf node_modules/.cache/
rm -rf build/

# Reinstall dependencies
rm -rf node_modules/
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

### Debugging Tips

#### Backend Debugging
```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Use Node.js debugger
node --inspect server.js

# Debug with VS Code
# Add to launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server.ts",
  "runtimeArgs": ["-r", "ts-node/register"],
  "env": { "NODE_ENV": "development" }
}
```

#### Database Debugging
```bash
# Connect to MongoDB shell
mongo

# Show databases
show dbs

# Use your database
use nlai-reply

# Show collections
show collections

# Query users
db.users.find().pretty()
```

### Performance Monitoring

#### Application Performance
```bash
# Monitor API response times
npm run monitor:api

# Check memory usage
npm run monitor:memory

# Profile application
npm run profile
```

#### Database Performance
```bash
# MongoDB performance stats
db.stats()

# Query performance
db.users.find({email: "test@example.com"}).explain("executionStats")

# Index usage
db.users.getIndexes()
```

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use different keys for development/staging/production
   - Rotate API keys regularly

2. **Database Security**
   - Enable authentication in production
   - Use SSL/TLS for connections
   - Regular backups

3. **API Security**
   - Implement proper rate limiting
   - Validate all inputs
   - Use HTTPS in production
   - Keep dependencies updated

## 📚 Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [React Documentation](https://reactjs.org/docs/)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-username/nlai-reply/issues)
2. Search Stack Overflow with relevant tags
3. Consult the official documentation for each technology
4. Join our [Discord Community](https://discord.gg/nlai-reply)

---

**Happy Coding! 🚀**