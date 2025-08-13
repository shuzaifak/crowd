require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./database/mongodb');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

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

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

const indexRoutes = require('./routes/index');
app.use('/api/index', indexRoutes);

const marketingRoutes = require('./routes/marketing');
app.use('/api/marketing', marketingRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const ordersRoutes = require('./routes/orders');
app.use('/api/orders', ordersRoutes);

const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

const teamRoutes = require('./routes/team');
app.use('/api/team', teamRoutes);

const financeRoutes = require('./routes/finance');
app.use('/api/finance', financeRoutes);

const appsRoutes = require('./routes/apps');
app.use('/api/apps', appsRoutes);

const collectionsRoutes = require('./routes/collections');
app.use('/api/collections', collectionsRoutes);

const monetizeRoutes = require('./routes/monetize');
app.use('/api/monetize', monetizeRoutes);

const eventsRoutes = require('./routes/events');
app.use('/api/events', eventsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Access granted to protected route',
    user: req.user
  });
});

app.use(express.static(path.join(__dirname, '..')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, async () => {
  if (process.env.USE_MONGODB === 'true') {
    await connectDB();
  } else {
    console.log('Using JSON file storage (MongoDB disabled)');
  }
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});