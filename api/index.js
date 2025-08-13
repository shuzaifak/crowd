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

// Import core routes first
try {
  const authMiddleware = require('../server/middleware/auth');
  authenticateToken = authMiddleware.authenticateToken;
  console.log('✅ Auth middleware imported successfully');
} catch (error) {
  console.error('❌ Auth middleware import failed:', error.message);
}

try {
  authRoutes = require('../server/routes/auth');
  console.log('✅ Auth routes imported successfully');
} catch (error) {
  console.error('❌ Auth routes import failed:', error.message);
}

try {
  usersRoutes = require('../server/routes/users');
  console.log('✅ Users routes imported successfully');
} catch (error) {
  console.error('❌ Users routes import failed:', error.message);
}

// Import other routes with individual error handling (no eval)
try {
  indexRoutes = require('../server/routes/index');
  console.log('✅ Index routes imported successfully');
} catch (error) {
  console.error('❌ Index routes import failed:', error.message);
}

try {
  eventsRoutes = require('../server/routes/events');
  console.log('✅ Events routes imported successfully');
} catch (error) {
  console.error('❌ Events routes import failed:', error.message);
}

try {
  financeRoutes = require('../server/routes/finance');
  console.log('✅ Finance routes imported successfully');
} catch (error) {
  console.error('❌ Finance routes import failed:', error.message);
}

try {
  appsRoutes = require('../server/routes/apps');
  console.log('✅ Apps routes imported successfully');
} catch (error) {
  console.error('❌ Apps routes import failed:', error.message);
}

try {
  dashboardRoutes = require('../server/routes/dashboard');
  console.log('✅ Dashboard routes imported successfully');
} catch (error) {
  console.error('❌ Dashboard routes import failed:', error.message);
}

try {
  marketingRoutes = require('../server/routes/marketing');
  console.log('✅ Marketing routes imported successfully');
} catch (error) {
  console.error('❌ Marketing routes import failed:', error.message);
}

try {
  analyticsRoutes = require('../server/routes/analytics');
  console.log('✅ Analytics routes imported successfully');
} catch (error) {
  console.error('❌ Analytics routes import failed:', error.message);
}

try {
  ordersRoutes = require('../server/routes/orders');
  console.log('✅ Orders routes imported successfully');
} catch (error) {
  console.error('❌ Orders routes import failed:', error.message);
}

try {
  teamRoutes = require('../server/routes/team');
  console.log('✅ Team routes imported successfully');
} catch (error) {
  console.error('❌ Team routes import failed:', error.message);
}

try {
  collectionsRoutes = require('../server/routes/collections');
  console.log('✅ Collections routes imported successfully');
} catch (error) {
  console.error('❌ Collections routes import failed:', error.message);
}

try {
  monetizeRoutes = require('../server/routes/monetize');
  console.log('✅ Monetize routes imported successfully');
} catch (error) {
  console.error('❌ Monetize routes import failed:', error.message);
}

try {
  likesRoutes = require('../server/routes/likes');
  console.log('✅ Likes routes imported successfully');
} catch (error) {
  console.error('❌ Likes routes import failed:', error.message);
}

// Database initialization with fallback
let databaseReady = false;
let dbError = null;
let mongoConnected = false;

const initializeDatabase = async () => {
  try {
    // Set default MongoDB URI if not provided
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb+srv://jalalsherazi575:MUSA123456@crowd.rmytvx2.mongodb.net/?retryWrites=true&w=majority&appName=CROWD';
    }
    
    // Set USE_MONGODB to true by default in production
    if (!process.env.USE_MONGODB && process.env.NODE_ENV === 'production') {
      process.env.USE_MONGODB = 'true';
    }

    if (process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI) {
      try {
        const { connectDB } = require('../server/database/mongodb');
        const connected = await connectDB();
        if (connected) {
          console.log('✅ MongoDB connected successfully for Vercel');
          mongoConnected = true;
          databaseReady = true;
        } else {
          console.warn('❌ MongoDB connection failed, will use database abstraction layer fallback');
          databaseReady = true; // Database abstraction layer will handle fallback
          dbError = 'MongoDB connection failed, using fallback storage';
        }
      } catch (mongoError) {
        console.warn('❌ MongoDB error, will use database abstraction layer fallback:', mongoError.message);
        databaseReady = true; // Database abstraction layer available
        dbError = 'MongoDB error: ' + mongoError.message;
      }
    } else {
      console.log('Using database abstraction layer (MongoDB disabled)');
      databaseReady = true;
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    databaseReady = true; // Still allow fallback storage
    dbError = error.message;
  }
};

// Initialize database with timeout
const dbInitPromise = initializeDatabase();

// Ensure database is ready before processing requests
const ensureDatabaseReady = async (req, res, next) => {
  try {
    await dbInitPromise;
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    databaseReady = true; // Fallback to JSON
    next();
  }
};

// Note: Database readiness will be checked per route group

// Database readiness middleware for protected routes
const checkDatabaseReady = (req, res, next) => {
  // Always allow routes to proceed since we have JSON fallback
  // Just add database status to request for route handlers to use
  req.databaseReady = databaseReady;
  req.mongoConnected = mongoConnected;
  req.dbError = dbError;
  next();
};

// API Routes with error handling - mount after database initialization
try {
  // Core authentication routes (always available)
  if (authRoutes) {
    app.use('/api/auth', authRoutes);
    console.log('🚀 Auth routes mounted successfully');
  } else {
    console.warn('⚠️ Auth routes not available');
  }
  
  if (usersRoutes) {
    app.use('/api/users', usersRoutes);
    console.log('🚀 Users routes mounted successfully');
  } else {
    console.warn('⚠️ Users routes not available');
  }

  // Public routes (no database dependency)
  if (indexRoutes) {
    app.use('/api/index', indexRoutes);
    console.log('🚀 Index routes mounted successfully');
  } else {
    console.warn('⚠️ Index routes not available');
  }

  // Mount all routes with database status info - they'll handle JSON fallback internally
  if (eventsRoutes) {
    app.use('/api/events', checkDatabaseReady, eventsRoutes);
    console.log('🚀 Events routes mounted successfully');
  } else {
    console.warn('⚠️ Events routes not available - check import errors');
  }

  if (appsRoutes) {
    app.use('/api/apps', checkDatabaseReady, appsRoutes);
    console.log('🚀 Apps routes mounted successfully');
  } else {
    console.warn('⚠️ Apps routes not available - check import errors');
  }

  if (dashboardRoutes) {
    app.use('/api/dashboard', checkDatabaseReady, dashboardRoutes);
    console.log('🚀 Dashboard routes mounted successfully');
  } else {
    console.warn('⚠️ Dashboard routes not available - check import errors');
  }

  if (financeRoutes) {
    app.use('/api/finance', checkDatabaseReady, financeRoutes);
    console.log('🚀 Finance routes mounted successfully');
  } else {
    console.warn('⚠️ Finance routes not available - check import errors');
  }

  if (marketingRoutes) {
    app.use('/api/marketing', checkDatabaseReady, marketingRoutes);
    console.log('🚀 Marketing routes mounted successfully');
  } else {
    console.warn('⚠️ Marketing routes not available - check import errors');
  }

  if (analyticsRoutes) {
    app.use('/api/analytics', checkDatabaseReady, analyticsRoutes);
    console.log('🚀 Analytics routes mounted successfully');
  } else {
    console.warn('⚠️ Analytics routes not available - check import errors');
  }

  if (ordersRoutes) {
    app.use('/api/orders', checkDatabaseReady, ordersRoutes);
    console.log('🚀 Orders routes mounted successfully');
  } else {
    console.warn('⚠️ Orders routes not available - check import errors');
  }

  if (teamRoutes) {
    app.use('/api/team', checkDatabaseReady, teamRoutes);
    console.log('🚀 Team routes mounted successfully');
  } else {
    console.warn('⚠️ Team routes not available - check import errors');
  }

  if (collectionsRoutes) {
    app.use('/api/collections', checkDatabaseReady, collectionsRoutes);
    console.log('🚀 Collections routes mounted successfully');
  } else {
    console.warn('⚠️ Collections routes not available - check import errors');
  }

  if (monetizeRoutes) {
    app.use('/api/monetize', checkDatabaseReady, monetizeRoutes);
    console.log('🚀 Monetize routes mounted successfully');
  } else {
    console.warn('⚠️ Monetize routes not available - check import errors');
  }

  if (likesRoutes) {
    app.use('/api/likes', checkDatabaseReady, likesRoutes);
    console.log('🚀 Likes routes mounted successfully');
  } else {
    console.warn('⚠️ Likes routes not available - check import errors');
  }

} catch (routeError) {
  console.error('❌ Error mounting routes:', routeError);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const healthData = { 
      status: databaseReady ? 'OK' : 'DEGRADED', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        type: process.env.USE_MONGODB === 'true' ? 'MongoDB' : 'JSON Files',
        ready: databaseReady,
        mongoConnected: mongoConnected,
        error: dbError
      },
      routes: {
        auth: !!authRoutes,
        users: !!usersRoutes,
        events: !!eventsRoutes,
        finance: !!financeRoutes,
        apps: !!appsRoutes,
        dashboard: !!dashboardRoutes,
        marketing: !!marketingRoutes,
        analytics: !!analyticsRoutes,
        orders: !!ordersRoutes,
        team: !!teamRoutes,
        collections: !!collectionsRoutes,
        monetize: !!monetizeRoutes,
        likes: !!likesRoutes
      },
      version: '1.0.0',
      uptime: process.uptime()
    };

    res.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
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
  try {
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
  } catch (error) {
    console.error('Root endpoint error:', error);
    res.status(500).json({
      error: 'Root endpoint error',
      message: 'API documentation unavailable',
      health: '/api/health'
    });
  }
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