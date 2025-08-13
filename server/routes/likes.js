const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get user's liked events
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting liked events for user: ${userId}`);

        // Get user's liked events from database
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get liked event IDs
        const likedEventIds = user.likedEvents || [];
        
        // Get full event details for liked events
        const allEvents = await db.getAllEvents();
        const likedEvents = allEvents.filter(event => likedEventIds.includes(event.id));

        // Sort by most recently liked (you might want to add a timestamp for this)
        likedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            likedEvents: likedEvents,
            count: likedEvents.length
        });

    } catch (error) {
        console.error('Error getting liked events:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve liked events',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Add event to user's likes
router.post('/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        console.log(`Adding event ${eventId} to likes for user: ${userId}`);

        // Check if event exists
        const event = await db.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize likedEvents array if it doesn't exist
        if (!user.likedEvents) {
            user.likedEvents = [];
        }

        // Check if already liked
        if (user.likedEvents.includes(eventId)) {
            return res.status(400).json({ error: 'Event already liked' });
        }

        // Add to liked events
        user.likedEvents.push(eventId);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            likedEvents: user.likedEvents,
            updatedAt: user.updatedAt
        });

        // Also update event's like count if you want to track this
        if (!event.likeCount) {
            event.likeCount = 0;
        }
        event.likeCount++;
        event.updatedAt = new Date().toISOString();

        await db.updateEvent(eventId, { 
            likeCount: event.likeCount,
            updatedAt: event.updatedAt
        });

        res.json({
            success: true,
            message: 'Event added to likes',
            event: event,
            totalLikes: user.likedEvents.length
        });

    } catch (error) {
        console.error('Error adding event to likes:', error);
        res.status(500).json({ 
            error: 'Failed to add event to likes',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Remove event from user's likes
router.delete('/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        console.log(`Removing event ${eventId} from likes for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize likedEvents array if it doesn't exist
        if (!user.likedEvents) {
            user.likedEvents = [];
        }

        // Check if event is liked
        if (!user.likedEvents.includes(eventId)) {
            return res.status(400).json({ error: 'Event not in likes' });
        }

        // Remove from liked events
        user.likedEvents = user.likedEvents.filter(id => id !== eventId);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            likedEvents: user.likedEvents,
            updatedAt: user.updatedAt
        });

        // Update event's like count if it exists
        const event = await db.getEventById(eventId);
        if (event && event.likeCount && event.likeCount > 0) {
            event.likeCount--;
            event.updatedAt = new Date().toISOString();
            
            await db.updateEvent(eventId, { 
                likeCount: event.likeCount,
                updatedAt: event.updatedAt
            });
        }

        res.json({
            success: true,
            message: 'Event removed from likes',
            totalLikes: user.likedEvents.length
        });

    } catch (error) {
        console.error('Error removing event from likes:', error);
        res.status(500).json({ 
            error: 'Failed to remove event from likes',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Check if user has liked a specific event
router.get('/check/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isLiked = user.likedEvents && user.likedEvents.includes(eventId);

        res.json({
            success: true,
            isLiked: isLiked,
            eventId: eventId
        });

    } catch (error) {
        console.error('Error checking like status:', error);
        res.status(500).json({ 
            error: 'Failed to check like status',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get user's like statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const likedEventIds = user.likedEvents || [];
        
        // Get categories of liked events for analysis
        const allEvents = await db.getAllEvents();
        const likedEvents = allEvents.filter(event => likedEventIds.includes(event.id));
        
        // Analyze liked events by category
        const categoryStats = {};
        const locationStats = {};
        
        likedEvents.forEach(event => {
            // Count by category
            const category = event.category || 'Other';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
            
            // Count by location
            const location = event.location || event.venue || 'Unknown';
            locationStats[location] = (locationStats[location] || 0) + 1;
        });

        res.json({
            success: true,
            totalLikes: likedEventIds.length,
            categoryStats: categoryStats,
            locationStats: locationStats,
            recentLikes: likedEvents.slice(0, 5) // Last 5 liked events
        });

    } catch (error) {
        console.error('Error getting like statistics:', error);
        res.status(500).json({ 
            error: 'Failed to get like statistics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

module.exports = router;