# Crowd Event Platform - Backend Setup

A secure Node.js backend with authentication for the Crowd event platform.

## Features

✅ **Secure Authentication**
- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting for security

✅ **RESTful API**
- Standardized API endpoints
- Comprehensive error handling
- Input validation with Joi

✅ **Security First**
- CORS protection
- Helmet.js security headers
- Protected routes with middleware

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will be available at:
- Frontend: http://localhost:3001
- API: http://localhost:3001/api

### 3. Test the API

**Sign up a new user:**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe", 
    "password": "password123",
    "isOrganizer": false
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Project Structure

```
server/
├── server.js              # Main server file
├── routes/
│   └── auth.js            # Authentication routes
├── middleware/
│   └── auth.js            # Authentication middleware
└── database/
    └── db.js              # File-based database

js/
├── data-manager.js        # Original frontend data manager
└── auth-api.js           # New backend API integration

API_DOCUMENTATION.md       # Comprehensive API docs
```

## API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

See `API_DOCUMENTATION.md` for detailed documentation.

## Frontend Integration

Your existing HTML forms can now connect to the backend:

```html
<!-- Add to your HTML files -->
<script src="js/auth-api.js"></script>
```

```javascript
// Example usage in your existing JavaScript
async function handleSignup(formData) {
  try {
    const result = await window.authAPI.signup({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
      isOrganizer: formData.isOrganizer
    });
    
    console.log('Signup successful:', result);
    // Redirect to login page
  } catch (error) {
    console.error('Signup failed:', error.message);
    // Show error to user
  }
}
```

## Data Storage

User data is stored in JSON files in `server/database/data/`:
- `users.json` - User accounts and profiles

For production, consider migrating to a proper database like PostgreSQL or MongoDB.

## Security Notes

- Change the JWT_SECRET in production
- Use environment variables for sensitive configuration
- Consider implementing password reset functionality
- Add email verification for production use
- Set up proper logging and monitoring

## Environment Configuration

Copy `.env.example` to `.env` and customize:
```bash
cp .env.example .env
```

## Troubleshooting

**Port already in use:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <PID> /F
```

**CORS issues:**
- Update CORS origins in `server.js`
- Make sure your frontend URL matches the allowed origins