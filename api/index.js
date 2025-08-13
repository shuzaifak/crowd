require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

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
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip + ':auth';
  }
});
app.use('/api/auth/', authLimiter);

// Import route handlers with error handling
let authRoutes, usersRoutes, authenticateToken;
let indexRoutes, marketingRoutes, dashboardRoutes, ordersRoutes;
let analyticsRoutes, teamRoutes, financeRoutes, appsRoutes;
let collectionsRoutes, monetizeRoutes, eventsRoutes, likesRoutes;

try {
  // Core routes
  authRoutes = require('../server/routes/auth');
  usersRoutes = require('../server/routes/users');
  const authMiddleware = require('../server/middleware/auth');
  authenticateToken = authMiddleware.authenticateToken;
  
  // Feature routes
  indexRoutes = require('../server/routes/index');
  marketingRoutes = require('../server/routes/marketing');
  dashboardRoutes = require('../server/routes/dashboard');
  ordersRoutes = require('../server/routes/orders');
  analyticsRoutes = require('../server/routes/analytics');
  teamRoutes = require('../server/routes/team');
  financeRoutes = require('../server/routes/finance');
  appsRoutes = require('../server/routes/apps');
  collectionsRoutes = require('../server/routes/collections');
  monetizeRoutes = require('../server/routes/monetize');
  eventsRoutes = require('../server/routes/events');
  likesRoutes = require('../server/routes/likes');
} catch (error) {
  console.error('Error importing routes:', error);
}

// Database initialization
const initializeDatabase = async () => {
  try {
    if (process.env.USE_MONGODB === 'true') {
      const { connectDB } = require('../server/database/mongodb');
      await connectDB();
      console.log('MongoDB connection initialized for Vercel');
    } else {
      console.log('Using JSON file storage (MongoDB disabled)');
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
};

// Initialize database
initializeDatabase();

// API Routes
if (authRoutes) app.use('/api/auth', authRoutes);
if (usersRoutes) app.use('/api/users', usersRoutes);
if (indexRoutes) app.use('/api/index', indexRoutes);
if (marketingRoutes) app.use('/api/marketing', marketingRoutes);
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);
if (ordersRoutes) app.use('/api/orders', ordersRoutes);
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);
if (teamRoutes) app.use('/api/team', teamRoutes);
if (financeRoutes) app.use('/api/finance', financeRoutes);
if (appsRoutes) app.use('/api/apps', appsRoutes);
if (collectionsRoutes) app.use('/api/collections', collectionsRoutes);
if (monetizeRoutes) app.use('/api/monetize', monetizeRoutes);
if (eventsRoutes) app.use('/api/events', eventsRoutes);
if (likesRoutes) app.use('/api/likes', likesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.USE_MONGODB === 'true' ? 'MongoDB' : 'JSON Files'
  });
});

// Protected route example
if (authenticateToken) {
  app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ 
      message: 'Access granted to protected route',
      user: req.user
    });
  });
}

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Crowd Event Platform API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/* (signup, login, profile)',
      events: '/api/events/* (CRUD, public discovery)',
      users: '/api/users/* (user management)',
      finance: '/api/finance/* (payouts, bank accounts)',
      apps: '/api/apps/* (marketplace)',
      dashboard: '/api/dashboard/* (analytics)',
      marketing: '/api/marketing/* (campaigns)',
      analytics: '/api/analytics/* (event metrics)',
      orders: '/api/orders/* (ticket sales)',
      teams: '/api/team/* (team management)',
      monetize: '/api/monetize/* (monetization)',
      collections: '/api/collections/* (event collections)',
      likes: '/api/likes/* (user interactions)'
    },
    documentation: '/api/health'
  });
});

// Catch-all handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: 'This is an API-only server. Please use /api/* endpoints.',
    path: req.originalUrl,
    availableEndpoints: [
      '/api/health',
      '/api/auth/*',
      '/api/events/*',
      '/api/users/*',
      '/api/finance/*',
      '/api/apps/*',
      '/api/dashboard/*',
      '/api/marketing/*',
      '/api/analytics/*',
      '/api/orders/*'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;