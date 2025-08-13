const express = require('express');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Mount likes routes
const likesRoutes = require('./likes');
router.use('/likes', likesRoutes);

// Get user profile stats
router.get('/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own stats or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Get user stats from database
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Get orders count
    const orders = await db.getUserOrders(userId);
    const ordersCount = orders ? orders.length : 0;

    // Get likes count (if implemented)
    const likes = await db.getUserLikes(userId);
    const likesCount = likes ? likes.length : 0;

    // Get following count (if implemented)
    const following = await db.getUserFollowing(userId);
    const followingCount = following ? following.length : 0;

    const stats = {
      orders: ordersCount,
      likes: likesCount,
      following: followingCount
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get user tickets
router.get('/:userId/tickets', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own tickets or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Get user tickets from database
    const tickets = await db.getUserTickets(userId);

    res.json({
      success: true,
      tickets: tickets || []
    });

  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get user orders
router.get('/:userId/orders', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own orders or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Get user orders from database
    const orders = await db.getUserOrders(userId);

    res.json({
      success: true,
      orders: orders || []
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get user profile (public data)
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Return public user data (excluding sensitive information)
    const publicUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: req.user.id === userId || req.user.role === 'admin' ? user.email : undefined,
      role: user.role,
      isOrganizer: user.isOrganizer,
      createdAt: user.createdAt,
      profile: user.profile || {}
    };

    res.json({
      success: true,
      user: publicUser
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;