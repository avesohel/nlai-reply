#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 NL AI Reply Service Setup${NC}"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js version 16+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB is not running. Please start MongoDB first.${NC}"
    echo "   brew services start mongodb/brew/mongodb-community (macOS)"
    echo "   sudo systemctl start mongod (Linux)"
    echo "   Or use MongoDB Atlas connection string"
    echo ""
fi

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd client
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your configuration:${NC}"
    echo "   - MongoDB connection string"
    echo "   - JWT secret key"
    echo "   - YouTube API credentials"
    echo "   - Stripe keys"
    echo "   - OpenAI API key"
    echo "   - Pinecone credentials"
    echo "   - SMTP settings"
    echo ""
fi

# Create logs directory
mkdir -p logs

echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit .env file with your API keys and configuration"
echo "2. Start MongoDB if not already running"
echo "3. Run: npm run seed (to seed database with sample data)"
echo "4. Run: npm run dev (to start development server)"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "- npm run dev     : Start both backend and frontend"
echo "- npm run server  : Start backend only"
echo "- npm run client  : Start frontend only"
echo "- npm run seed    : Seed database with sample data"
echo "- npm test        : Run tests"
echo "- npm run lint    : Run ESLint"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"