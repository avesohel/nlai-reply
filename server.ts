import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Import TypeScript modules
import connectDB from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import subscriptionRoutes from './routes/subscriptions';
import youtubeRoutes from './routes/youtube';
import facebookRoutes from './routes/facebook';
import aiRoutes from './routes/ai';
import webhookRoutes from './routes/webhooks';
import templateRoutes from './routes/templates';
import analyticsRoutes from './routes/analytics';
import errorHandler from './middleware/errorHandler';

// Configure environment
dotenv.config();

// Import TypeScript services
import { startCronJobs } from './services/cronService';

// All routes now converted to TypeScript

const app: Application = express();

// Trust proxy for Railway, Heroku, etc.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS!) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS!) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB().then(() => {
  console.log('✅ Database connected successfully');
  startCronJobs();
});

// Routes - All TypeScript
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Favicon route to prevent 404
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT: number = parseInt(process.env.PORT!) || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;