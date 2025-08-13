const express = require('express');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public index endpoint - no authentication required
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, location, search } = req.query;
    const offset = (page - 1) * limit;

    // Get public events (published and active)
    const events = await db.getPublicEvents({
      offset: parseInt(offset),
      limit: parseInt(limit),
      category,
      location,
      search
    });

    // Get basic stats
    const stats = await db.getPublicStats();

    res.json({
      success: true,
      data: {
        events: events || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: stats.totalEvents || 0,
          totalPages: Math.ceil((stats.totalEvents || 0) / limit)
        },
        stats: {
          totalEvents: stats.totalEvents || 0,
          totalCategories: stats.totalCategories || 0,
          upcomingEvents: stats.upcomingEvents || 0
        },
        categories: stats.categories || [],
        locations: stats.locations || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Public index error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load events' 
    });
  }
});

// Authenticated index endpoint - requires login
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, location, search } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Get personalized events based on user preferences
    const events = await db.getPersonalizedEvents({
      userId,
      offset: parseInt(offset),
      limit: parseInt(limit),
      category,
      location,
      search
    });

    // Get user-specific data
    const userStats = await db.getUserStats(userId);
    const recommendations = await db.getRecommendedEvents(userId, 5);
    const recentActivity = await db.getUserRecentActivity(userId, 10);

    res.json({
      success: true,
      data: {
        events: events || [],
        recommendations: recommendations || [],
        recentActivity: recentActivity || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userStats.totalAvailableEvents || 0,
          totalPages: Math.ceil((userStats.totalAvailableEvents || 0) / limit)
        },
        userStats: {
          eventsAttended: userStats.eventsAttended || 0,
          eventsCreated: userStats.eventsCreated || 0,
          ticketsPurchased: userStats.ticketsPurchased || 0,
          favoriteCategories: userStats.favoriteCategories || [],
          savedEvents: userStats.savedEvents || 0
        },
        personalizedData: {
          suggestedCategories: userStats.suggestedCategories || [],
          nearbyEvents: userStats.nearbyEvents || [],
          friendsActivity: userStats.friendsActivity || []
        }
      },
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        preferences: req.user.preferences || {}
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard index error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load dashboard data' 
    });
  }
});

// Get trending events (public)
router.get('/trending', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const trendingEvents = await db.getTrendingEvents(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        events: trendingEvents || [],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Trending events error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load trending events' 
    });
  }
});

// Get featured events (public)
router.get('/featured', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    const featuredEvents = await db.getFeaturedEvents(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        events: featuredEvents || [],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Featured events error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load featured events' 
    });
  }
});

module.exports = router;