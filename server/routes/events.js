const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Event = require('../database/models/Event');
const User = require('../database/models/User');

// Get all events for authenticated user (organizer dashboard)
router.get('/my-events', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;
        
        let query = { organizerId: req.user.id };
        
        if (status) {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        
        const events = await Event.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip(offset);
            
        const total = await Event.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                events,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events'
        });
    }
});

// Get specific event by ID (for organizer)
router.get('/:eventId', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findOne({ 
            id: req.params.eventId,
            organizerId: req.user.id 
        });
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }
        
        res.json({
            success: true,
            data: { event }
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event'
        });
    }
});

// Create new event
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            startDate,
            endDate,
            price,
            currency,
            maxAttendees,
            imageUrl,
            tags,
            ticketTypes,
            overviewDescription,
            whyAttend,
            howToParticipate,
            closingMessage
        } = req.body;
        
        // Generate unique event ID
        const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Get user info for organizer
        const user = await User.findById(req.user.id);
        const organizerName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.email.split('@')[0];
        
        const newEvent = new Event({
            id: eventId,
            title,
            description,
            category,
            location,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            price: price || 0,
            currency: currency || 'USD',
            maxAttendees: maxAttendees || 100,
            organizer: organizerName,
            organizerId: req.user.id,
            status: 'draft',
            imageUrl,
            tags: tags || [],
            ticketTypes: ticketTypes || [],
            // Additional event details
            overviewDescription,
            whyAttend,
            howToParticipate,
            closingMessage
        });
        
        const savedEvent = await newEvent.save();
        
        res.status(201).json({
            success: true,
            data: { event: savedEvent },
            message: 'Event created successfully'
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create event'
        });
    }
});

// Update event
router.put('/:eventId', authenticateToken, async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData.id; // Prevent ID modification
        delete updateData.organizerId; // Prevent organizer modification
        
        // Convert date strings to Date objects if present
        if (updateData.startDate) {
            updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
            updateData.endDate = new Date(updateData.endDate);
        }
        
        const event = await Event.findOneAndUpdate(
            { 
                id: req.params.eventId,
                organizerId: req.user.id 
            },
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }
        
        res.json({
            success: true,
            data: { event },
            message: 'Event updated successfully'
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update event'
        });
    }
});

// Publish event
router.patch('/:eventId/publish', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findOneAndUpdate(
            { 
                id: req.params.eventId,
                organizerId: req.user.id 
            },
            { 
                status: 'published',
                publishedAt: new Date()
            },
            { new: true }
        );
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }
        
        res.json({
            success: true,
            data: { event },
            message: 'Event published successfully'
        });
    } catch (error) {
        console.error('Error publishing event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to publish event'
        });
    }
});

// Delete event
router.delete('/:eventId', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findOneAndDelete({
            id: req.params.eventId,
            organizerId: req.user.id
        });
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }
        
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete event'
        });
    }
});

// Get public event (for attendee view)
router.get('/public/:eventId', async (req, res) => {
    try {
        const event = await Event.findOne({ 
            id: req.params.eventId,
            status: 'published',
            isActive: true
        }).populate('organizerId', 'firstName lastName email');
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or not available'
            });
        }
        
        res.json({
            success: true,
            data: { event }
        });
    } catch (error) {
        console.error('Error fetching public event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event'
        });
    }
});

// Get organizer info for an event
router.get('/:eventId/organizer', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findOne({ 
            id: req.params.eventId 
        });
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        
        const organizer = await User.findById(event.organizerId).select('firstName lastName email');
        
        if (!organizer) {
            return res.status(404).json({
                success: false,
                error: 'Organizer not found'
            });
        }
        
        res.json({
            success: true,
            data: { 
                organizer: {
                    name: organizer.firstName && organizer.lastName 
                        ? `${organizer.firstName} ${organizer.lastName}`
                        : organizer.email.split('@')[0],
                    email: organizer.email,
                    firstName: organizer.firstName,
                    lastName: organizer.lastName
                }
            }
        });
    } catch (error) {
        console.error('Error fetching organizer info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch organizer information'
        });
    }
});

// Get event statistics for organizer
router.get('/:eventId/stats', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findOne({ 
            id: req.params.eventId,
            organizerId: req.user.id 
        });
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }
        
        const stats = {
            totalAttendees: event.currentAttendees,
            maxAttendees: event.maxAttendees,
            ticketsSold: event.ticketTypes.reduce((sum, ticket) => sum + (ticket.sold || 0), 0),
            totalRevenue: event.ticketTypes.reduce((sum, ticket) => sum + ((ticket.sold || 0) * ticket.price), 0),
            registrationRate: event.maxAttendees > 0 ? (event.currentAttendees / event.maxAttendees * 100).toFixed(1) : 0,
            status: event.status,
            publishedAt: event.publishedAt,
            createdAt: event.createdAt,
            daysUntilEvent: Math.ceil((new Date(event.startDate) - new Date()) / (1000 * 60 * 60 * 24))
        };
        
        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event statistics'
        });
    }
});

module.exports = router;