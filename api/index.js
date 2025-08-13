require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('../server/database/mongodb');
const authRoutes = require('../server/routes/auth');
const usersRoutes = require('../server/routes/users');
const { authenticateToken } = require('../server/middleware/auth');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://crowd-web01.vercel.app',
        process.env.FRONTEND_URL
      ] 
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow 10 attempts instead of 5
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true,
  // Custom key generator for better tracking
  keyGenerator: (req) => {
    return req.ip + ':auth';
  }
});
app.use('/api/auth/', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Import and mount other route handlers
const indexRoutes = require('../server/routes/index');
app.use('/api/index', indexRoutes);

const marketingRoutes = require('../server/routes/marketing');
app.use('/api/marketing', marketingRoutes);

const dashboardRoutes = require('../server/routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const ordersRoutes = require('../server/routes/orders');
app.use('/api/orders', ordersRoutes);

const analyticsRoutes = require('../server/routes/analytics');
app.use('/api/analytics', analyticsRoutes);

const teamRoutes = require('../server/routes/team');
app.use('/api/team', teamRoutes);

const financeRoutes = require('../server/routes/finance');
app.use('/api/finance', financeRoutes);

const appsRoutes = require('../server/routes/apps');
app.use('/api/apps', appsRoutes);

const collectionsRoutes = require('../server/routes/collections');
app.use('/api/collections', collectionsRoutes);

const monetizeRoutes = require('../server/routes/monetize');
app.use('/api/monetize', monetizeRoutes);

const eventsRoutes = require('../server/routes/events');
app.use('/api/events', eventsRoutes);

const likesRoutes = require('../server/routes/likes');
app.use('/api/likes', likesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Access granted to protected route',
    user: req.user
  });
});

// API-only - no static file serving
app.get('/', (req, res) => {
  res.json({
    message: 'Crowd Event Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      events: '/api/events/*',
      users: '/api/users/*',
      finance: '/api/finance/*',
      apps: '/api/apps/*',
      dashboard: '/api/dashboard/*',
      marketing: '/api/marketing/*',
      analytics: '/api/analytics/*',
      orders: '/api/orders/*'
    },
    documentation: '/api/health'
  });
});

// Catch-all handler for undefined routes
app.get('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    message: 'This is an API-only server. Please use /api/* endpoints.'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize MongoDB connection for Vercel
const initializeDatabase = async () => {
  try {
    if (process.env.USE_MONGODB === 'true') {
      await connectDB();
      console.log('MongoDB connection initialized for Vercel');
    } else {
      console.log('Using JSON file storage (MongoDB disabled)');
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
};

// Initialize database connection
initializeDatabase();

// Export for Vercel serverless functions
module.exports = app;