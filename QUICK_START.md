# ⚡ Quick Start Guide

Get your YouTube Reply Service with AI features running in 5 minutes!

## 🎯 One-Command Setup

```bash
# 1. Install dependencies and setup
npm run setup

# 2. Copy and edit environment file
cp .env.example .env
# Edit .env with your API keys (see below)

# 3. Seed database with sample data
npm run seed

# 4. Start development servers
npm run dev
```

## 🔑 Minimum Required Environment Variables

Add these to your `.env` file:

```env
# Required for basic functionality
MONGODB_URI=mongodb://localhost:27017/nlai-reply
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
YOUTUBE_API_KEY=AIzaSyC...your-youtube-api-key

# Required for AI features
OPENAI_API_KEY=sk-your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=youtube-transcripts

# Optional but recommended
STRIPE_SECRET_KEY=sk_test_your-stripe-key
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🚀 Access Points

After running `npm run dev`:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health

## 🧪 Quick Test

```bash
# Test your setup
npm run test:setup

# Login with test credentials
# Email: test@replybot.com
# Password: user123
```

## 🤖 AI Features Setup

1. **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/)
2. **Pinecone**: Create free account at [pinecone.io](https://www.pinecone.io/)
   - Create index: `youtube-transcripts`
   - Dimensions: `1536`
   - Metric: `cosine`

## 📱 Test the AI Features

1. Go to AI Settings: http://localhost:3000/ai-settings
2. Configure personality and tone
3. Test AI replies with sample comments
4. Try extracting transcript from a YouTube video

## 🐛 Troubleshooting

```bash
# Check if MongoDB is running
ps aux | grep mongod

# Kill processes on busy ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend

# Check logs
tail -f logs/combined.log
```

## 🎉 You're Ready!

Your AI-powered YouTube Reply Service is now running with:

✅ Natural AI reply generation
✅ Video transcript analysis
✅ Vector-based content matching
✅ Subscription management
✅ YouTube API integration
✅ Real-time dashboard

## 📚 Next Steps

- Read `SETUP_GUIDE.md` for detailed instructions
- Check `API.md` for API documentation
- Use `test-endpoints.http` to test API endpoints
- Deploy using `DEPLOYMENT.md` guide

Happy coding! 🚀

---

**Author:** Ali Sohel (avesohel@gmail.com)
