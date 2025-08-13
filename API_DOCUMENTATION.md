# Crowd Platform Authentication API

This document describes the authentication API endpoints for the Crowd event platform.

## Base URL
```
http://localhost:3001/api
```

## Authentication Endpoints

### 1. Sign Up
**POST** `/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe", 
  "password": "securepassword123",
  "isOrganizer": false
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isOrganizer": false,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "profile": {
      "avatar": null,
      "bio": "",
      "website": "",
      "socialLinks": {}
    }
  }
}
```

**Response (Error - 409):**
```json
{
  "error": "User with this email already exists"
}
```

### 2. Login
**POST** `/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isOrganizer": false,
    "isActive": true
  }
}
```

**Response (Error - 401):**
```json
{
  "error": "Invalid credentials"
}
```

### 3. Logout
**POST** `/auth/logout`

Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 4. Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isOrganizer": false,
    "isActive": true
  }
}
```

### 5. Update Profile
**PUT** `/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "profile": {
    "bio": "Event enthusiast and organizer",
    "website": "https://example.com",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "user",
    "isOrganizer": false,
    "profile": {
      "bio": "Event enthusiast and organizer",
      "website": "https://example.com",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

## Frontend Integration

### JavaScript Example

```javascript
class AuthAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = localStorage.getItem('authToken');
  }

  async signup(userData) {
    try {
      const response = await fetch(`${this.baseURL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store token
      localStorage.setItem('authToken', data.token);
      this.token = data.token;
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      if (this.token) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          }
        });
      }
      
      // Clear token
      localStorage.removeItem('authToken');
      this.token = null;
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Clear token even if request fails
      localStorage.removeItem('authToken');
      this.token = null;
      return { success: true };
    }
  }

  async getCurrentUser() {
    try {
      if (!this.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${this.baseURL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
}

// Usage
const authAPI = new AuthAPI();

// Sign up
const signupResult = await authAPI.signup({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'password123',
  isOrganizer: false
});

// Login
const loginResult = await authAPI.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const userResult = await authAPI.getCurrentUser();
```

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
- **JWT Authentication**: Secure JSON Web Tokens for session management
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation using Joi
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet Security**: Additional security headers via Helmet.js

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- **200**: Success
- **201**: Created successfully
- **400**: Bad request (validation error)
- **401**: Unauthorized (invalid credentials)
- **403**: Forbidden (insufficient permissions)
- **409**: Conflict (resource already exists)
- **500**: Internal server error

## Starting the Server

To start the backend server:

```bash
# Development mode
npm run dev

# Production mode  
npm start
```

The server will run on `http://localhost:3001` by default.