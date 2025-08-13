const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'crowd_platform_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isOrganizer: user.isOrganizer
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    try {
      const user = await db.findUserById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }

      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  });
}

function requireOrganizer(req, res, next) {
  if (!req.user || !req.user.isOrganizer) {
    return res.status(403).json({ error: 'Organizer access required' });
  }
  next();
}

module.exports = {
  generateToken,
  authenticateToken,
  requireOrganizer,
  JWT_SECRET,
  JWT_EXPIRES_IN
};