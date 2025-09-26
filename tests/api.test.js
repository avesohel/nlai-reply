const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('API Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/nlai-reply-test'
      );
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    test('GET /api/health should return 200', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/register should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app).post('/api/auth/register').send(userData).expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      authToken = response.body.token;
    });

    test('POST /api/auth/login should authenticate user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app).post('/api/auth/login').send(loginData).expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    test('GET /api/auth/me should return user info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('AI Features', () => {
    test('GET /api/ai/settings should return AI settings', async () => {
      const response = await request(app)
        .get('/api/ai/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.settings).toBeDefined();
      expect(response.body.settings.isEnabled).toBeDefined();
    });

    test('PUT /api/ai/settings should update AI settings', async () => {
      const settings = {
        isEnabled: true,
        replyTone: 'professional',
        replyLength: 'short',
      };

      const response = await request(app)
        .put('/api/ai/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settings)
        .expect(200);

      expect(response.body.settings.replyTone).toBe('professional');
    });
  });

  describe('Subscription Plans', () => {
    test('GET /api/subscriptions/plans should return available plans', async () => {
      const response = await request(app).get('/api/subscriptions/plans').expect(200);

      expect(response.body.plans).toBeDefined();
      expect(response.body.plans.basic).toBeDefined();
      expect(response.body.plans.pro).toBeDefined();
      expect(response.body.plans.enterprise).toBeDefined();
    });
  });
});
