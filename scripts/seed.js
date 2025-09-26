const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Subscription = require('../models/Subscription');
const ReplyTemplate = require('../models/ReplyTemplate');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🌱 Starting database seeding...');

    await User.deleteMany({});
    await Subscription.deleteMany({});
    await ReplyTemplate.deleteMany({});

    const adminPassword = 'admin123';
    const userPassword = 'user123';

    const adminUser = await User.create({
      name: 'Ali Sohel',
      email: 'avesohel@gmail.com',
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
      isActive: true,
      usage: {
        currentPeriodStart: new Date(),
        currentPeriodReplies: 0,
        repliesSent: 0,
      },
    });

    const testUser = await User.create({
      name: 'Test User',
      email: 'test@replybot.com',
      password: userPassword,
      role: 'user',
      emailVerified: true,
      isActive: true,
      youtubeChannels: [
        {
          channelId: 'UC_test_channel_id',
          channelName: 'Test Channel',
          connected: true,
          lastSync: new Date(),
        },
      ],
      usage: {
        currentPeriodStart: new Date(),
        currentPeriodReplies: 25,
        repliesSent: 156,
      },
    });

    const proSubscription = await Subscription.create({
      user: testUser._id,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      features: {
        repliesPerMonth: 500,
        channels: 5,
        prioritySupport: true,
        analytics: true,
        customTemplates: true,
      },
      pricing: {
        amount: 29.99,
        currency: 'usd',
        interval: 'month',
      },
    });

    testUser.subscription = proSubscription._id;
    await testUser.save();

    const templates = await ReplyTemplate.create([
      {
        user: testUser._id,
        name: 'Thank You Template',
        content: 'Thank you {{username}} for your comment! I really appreciate your support. 🙏',
        triggers: ['thanks', 'thank you', 'appreciate'],
        conditions: {
          sentiment: 'positive',
          keywords: ['great', 'awesome', 'love'],
        },
        isActive: true,
        usageCount: 45,
        variables: [{ name: 'username', defaultValue: 'there', required: false }],
      },
      {
        user: testUser._id,
        name: 'Question Response',
        content:
          "Hi {{username}}! That's a great question. You can find more information about {{topic}} in the video description or check out my other videos on this topic.",
        triggers: ['question', 'how', 'what', 'why'],
        conditions: {
          sentiment: 'neutral',
          keywords: ['question', 'help', 'explain'],
        },
        isActive: true,
        usageCount: 23,
        variables: [
          { name: 'username', defaultValue: 'there', required: false },
          { name: 'topic', defaultValue: 'this', required: false },
        ],
      },
      {
        user: testUser._id,
        name: 'Subscribe Reminder',
        content:
          "Hey {{username}}! If you enjoyed this content, don't forget to subscribe and hit the bell icon for notifications! 🔔",
        triggers: ['first time', 'new viewer', 'discovered'],
        conditions: {
          sentiment: 'positive',
        },
        isActive: true,
        usageCount: 67,
        variables: [{ name: 'username', defaultValue: 'there', required: false }],
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('📊 Created:');
    console.log(`   - ${templates.length} reply templates`);
    console.log(`   - 2 users (avesohel@gmail.com / test@replybot.com)`);
    console.log(`   - 1 active subscription`);
    console.log('\n🔐 Login credentials:');
    console.log('   Admin: avesohel@gmail.com / admin123');
    console.log('   User:  test@replybot.com / user123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedData();
