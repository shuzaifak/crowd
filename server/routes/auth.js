const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  firstName: Joi.string().min(1).max(50).trim().required().messages({
    'string.min': 'First name is required',
    'string.max': 'First name must be less than 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(1).max(50).trim().required().messages({
    'string.min': 'Last name is required',
    'string.max': 'Last name must be less than 50 characters',
    'any.required': 'Last name is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must be less than 128 characters',
    'any.required': 'Password is required'
  }),
  isOrganizer: Joi.boolean().default(false)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

router.post('/signup', async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    const { email, firstName, lastName, password, isOrganizer } = value;

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.createUser({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      isOrganizer,
      role: isOrganizer ? 'organizer' : 'user'
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to create user' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: result.user
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    const { email, password } = value;

    const user = await db.findUserByEmail(email);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      rateLimit: {
        remaining: res.get('X-RateLimit-Remaining'),
        reset: res.get('X-RateLimit-Reset')
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updateSchema = Joi.object({
      firstName: Joi.string().min(1).max(50).trim().optional(),
      lastName: Joi.string().min(1).max(50).trim().optional(),
      profile: Joi.object({
        bio: Joi.string().max(500).allow('').optional(),
        website: Joi.string().uri().allow('').optional(),
        avatar: Joi.string().uri().allow('').optional()
      }).optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    const result = await db.updateUser(req.user.id, value);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to update profile' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.user
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;