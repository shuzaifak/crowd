# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Available Commands

### Development
- `npm run dev` - Start the development server (runs server/server.js)
- `npm start` - Start the production server  
- `npm run build` - No-op build command (echo 'Build complete - using serverless functions')

### Server Details
- Server runs on port 3001 by default (configurable via `PORT` env var)
- API endpoints available at `http://localhost:3001/api`
- Frontend served statically from root directory at `http://localhost:3001`
- Health check available at `/api/health`

## Project Architecture

This is a crowd event platform built with Express.js featuring dual database storage (JSON files + MongoDB).

### Core Structure
```
├── server/
│   ├── server.js              # Main Express application with all route mounting
│   ├── database/              # Database abstraction layer
│   │   ├── db.js             # JSON file-based storage (default)
│   │   ├── mongoDatabase.js  # MongoDB implementation
│   │   ├── mongodb.js        # MongoDB connection setup
│   │   └── models/           # Mongoose schema definitions
│   ├── routes/               # Feature-based API route handlers
│   │   ├── auth.js           # Authentication & user profile
│   │   ├── events.js         # Event CRUD operations
│   │   ├── finance.js        # Financial/payout system
│   │   ├── apps.js           # App marketplace
│   │   ├── dashboard.js      # Dashboard data aggregation
│   │   ├── marketing.js      # Marketing campaigns
│   │   ├── analytics.js      # Event analytics
│   │   └── [10+ other routes]
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   └── adminAuth.js      # Admin role verification
│   └── scripts/
│       └── make-admin.js     # Admin user creation utility
├── js/                       # Frontend JavaScript modules
│   ├── auth-api.js          # Frontend API client for authentication
│   └── [other frontend utilities]
├── [30+ HTML files]         # Frontend pages and components
└── API_DOCUMENTATION.md     # Comprehensive API reference
```

### Database Architecture
**Dual Storage System**: The platform supports both JSON file storage (default) and MongoDB through an abstraction layer.

- **Toggle**: Set `USE_MONGODB=true` environment variable to use MongoDB
- **JSON Storage**: Files in `server/database/data/` (users.json, events.json, bankAccounts.json, apps.json)
- **MongoDB**: Full Mongoose models with validation and relationships
- **Database Interface**: Both implementations provide identical API through `db.js` and `mongoDatabase.js`

Key entities: User (with roles, teams, social stats), Event (with tickets, analytics), FinancialAccount (payouts, bank accounts), App (marketplace), Collection

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with `jsonwebtoken`
- **Password Security**: bcrypt with 12 salt rounds
- **Rate Limiting**: 10 requests/15min for auth endpoints, 100/15min general
- **User Roles**: 'user', 'organizer', 'admin' with middleware enforcement
- **Team Management**: Multi-user organizations with custom roles and invitations

### Security Implementation
- **Helmet.js**: Comprehensive security headers with CSP
- **CORS**: Environment-specific origins (dev vs production)
- **Input Validation**: Joi schemas throughout API
- **Authentication Middleware**: `authenticateToken`, `requireOrganizer`, `requireAdmin`
- **Error Handling**: Centralized error middleware with environment-aware responses

### API Architecture
The platform exposes 15+ route groups under `/api/`:

**Core Features:**
- `/api/auth/*` - User authentication, signup, profile management
- `/api/events/*` - Event creation, management, public discovery
- `/api/users/*` - User operations, team management
- `/api/finance/*` - Payout system, bank accounts, financial reporting

**Platform Features:**
- `/api/apps/*` - Third-party app marketplace with install/uninstall
- `/api/dashboard/*` - Aggregated data for organizer dashboards  
- `/api/marketing/*` - Campaign management, social media integration
- `/api/analytics/*` - Event performance metrics
- `/api/orders/*` - Ticket sales and order processing

### Frontend Integration
The platform serves a complete frontend with 30+ HTML pages covering:
- User authentication flows (login.html, signup.html)
- Event management (create-events.html, event-editor.html)
- Financial dashboards (finance.html, reporting.html)
- App marketplace (AppMarketplace.html)
- Marketing tools (marketing.html, analytics.html)

Frontend JavaScript modules in `/js/` provide API clients and utilities for seamless backend integration.

### Environment Configuration
```bash
PORT=3001                    # Server port
NODE_ENV=production          # Environment mode  
JWT_SECRET=your_secret_here  # JWT signing key
USE_MONGODB=true            # Enable MongoDB (default: JSON files)
MONGODB_URI=mongodb://...   # MongoDB connection string
```

### Development Workflow
- **Hot Reload**: `npm run dev` for development with automatic restarts
- **Testing**: Multiple test scripts and utilities in root directory
- **API Documentation**: Comprehensive docs in `API_DOCUMENTATION.md`
- **Admin Setup**: Use `server/scripts/make-admin.js` to create admin users
- **Static Assets**: All frontend files served directly from root directory