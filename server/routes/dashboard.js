const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get dashboard data for authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting dashboard data for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        const userStats = await db.getUserStats(userId);
        
        // Get user's recent activity
        const recentActivity = await db.getUserRecentActivity(userId, 5);
        
        // Get recommended events
        const recommendedEvents = await db.getRecommendedEvents(userId, 4);
        
        // Get trending events
        const trendingEvents = await db.getTrendingEvents(6);
        
        // Get user tickets
        const userTickets = await db.getUserTickets(userId);
        const upcomingTickets = userTickets.filter(ticket => 
            new Date(ticket.eventDate) > new Date()
        ).slice(0, 3);

        // Get user's liked events
        const likedEvents = user.likedEvents || [];
        const allEvents = await db.getAllEvents();
        const userLikedEvents = allEvents.filter(event => 
            likedEvents.includes(event.id)
        ).slice(0, 3);

        res.json({
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profile: user.profile || {}
            },
            stats: userStats,
            recentActivity: recentActivity,
            recommendedEvents: recommendedEvents,
            trendingEvents: trendingEvents,
            upcomingTickets: upcomingTickets,
            likedEvents: userLikedEvents
        });

    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve dashboard data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting notifications for user: ${userId}`);

        // Mock notifications - in real app, this would query a notifications table
        const notifications = [
            {
                id: 'notif_1',
                title: 'Event Reminder',
                message: 'Tech Innovation Summit 2025 starts in 2 days!',
                type: 'event_reminder',
                isRead: false,
                createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
            },
            {
                id: 'notif_2',
                title: 'New Event Match',
                message: 'Found 3 new events matching your interests',
                type: 'recommendation',
                isRead: false,
                createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
            },
            {
                id: 'notif_3',
                title: 'Ticket Confirmed',
                message: 'Your ticket for Lahore Food Festival has been confirmed',
                type: 'ticket_confirmation',
                isRead: true,
                createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
            }
        ];

        res.json({
            success: true,
            notifications: notifications,
            unreadCount: notifications.filter(n => !n.isRead).length
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve notifications',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.notificationId;
        
        console.log(`Marking notification ${notificationId} as read for user: ${userId}`);

        // In a real app, this would update the notification in database
        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            error: 'Failed to mark notification as read',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

module.exports = router;