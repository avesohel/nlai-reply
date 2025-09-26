#!/usr/bin/env node

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function testSetup() {
  log('blue', '🧪 Testing YouTube Reply Service Setup...\n');

  // Test 1: Environment Variables
  log('blue', '1. Testing Environment Variables...');
  const requiredEnvs = [
    'MONGODB_URI',
    'JWT_SECRET',
    'YOUTUBE_API_KEY',
    'OPENAI_API_KEY',
    'PINECONE_API_KEY'
  ];

  for (const env of requiredEnvs) {
    if (process.env[env]) {
      log('green', `   ✅ ${env} is set`);
    } else {
      log('red', `   ❌ ${env} is missing`);
    }
  }

  // Test 2: MongoDB Connection
  log('blue', '\n2. Testing MongoDB Connection...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('green', '   ✅ MongoDB connection successful');
    await mongoose.disconnect();
  } catch (error) {
    log('red', `   ❌ MongoDB connection failed: ${error.message}`);
  }

  // Test 3: Server Health Check
  log('blue', '\n3. Testing Server Health...');
  try {
    const response = await axios.get('http://localhost:5000/api/health', {
      timeout: 5000
    });
    if (response.status === 200) {
      log('green', '   ✅ Server is running and healthy');
    } else {
      log('yellow', `   ⚠️  Server responded with status: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('yellow', '   ⚠️  Server is not running. Start with: npm run dev');
    } else {
      log('red', `   ❌ Server health check failed: ${error.message}`);
    }
  }

  // Test 4: OpenAI API
  log('blue', '\n4. Testing OpenAI API...');
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      if (response.choices && response.choices.length > 0) {
        log('green', '   ✅ OpenAI API is working');
      } else {
        log('red', '   ❌ OpenAI API returned unexpected response');
      }
    } catch (error) {
      log('red', `   ❌ OpenAI API test failed: ${error.message}`);
    }
  } else {
    log('yellow', '   ⚠️  OpenAI API key not set, skipping test');
  }

  // Test 5: Pinecone Connection
  log('blue', '\n5. Testing Pinecone Connection...');
  if (process.env.PINECONE_API_KEY) {
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

      const indexName = process.env.PINECONE_INDEX_NAME || 'youtube-transcripts';
      const index = pinecone.index(indexName);

      await index.describeIndexStats();
      log('green', '   ✅ Pinecone connection successful');
    } catch (error) {
      log('red', `   ❌ Pinecone connection failed: ${error.message}`);
    }
  } else {
    log('yellow', '   ⚠️  Pinecone API key not set, skipping test');
  }

  // Test 6: YouTube API
  log('blue', '\n6. Testing YouTube API...');
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${process.env.YOUTUBE_API_KEY}&maxResults=1`);

      if (response.status === 200) {
        log('green', '   ✅ YouTube API is working');
      } else {
        log('red', '   ❌ YouTube API returned unexpected response');
      }
    } catch (error) {
      log('red', `   ❌ YouTube API test failed: ${error.response?.data?.error?.message || error.message}`);
    }
  } else {
    log('yellow', '   ⚠️  YouTube API key not set, skipping test');
  }

  log('blue', '\n🎉 Setup test completed!\n');

  // Recommendations
  log('blue', '📝 Recommendations:');
  log('blue', '   - Ensure all environment variables are properly set');
  log('blue', '   - Start the server with: npm run dev');
  log('blue', '   - Seed the database with: npm run seed');
  log('blue', '   - Test the frontend at: http://localhost:3000');
  log('blue', '   - Use REST client to test API endpoints');
}

testSetup().catch(error => {
  log('red', `\n❌ Setup test failed: ${error.message}`);
  process.exit(1);
});