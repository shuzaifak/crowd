const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get comprehensive analytics data for authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting analytics data for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        const userStats = await db.getUserStats(userId);
        
        // Get user orders and tickets for revenue analysis
        const orders = await db.getUserOrders(userId);
        const tickets = await db.getUserTickets(userId);

        // Calculate revenue data
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const monthlyRevenue = calculateMonthlyRevenue(orders);
        
        // Calculate event performance
        const eventPerformance = calculateEventPerformance(tickets, orders);
        
        // Get attendance data
        const attendanceData = calculateAttendanceData(tickets);
        
        // Calculate ticket sales data
        const ticketSales = calculateTicketSales(tickets);
        
        // Get top performing events
        const topEvents = getTopPerformingEvents(tickets, orders);
        
        // Calculate audience insights
        const audienceInsights = calculateAudienceInsights(user, tickets);

        res.json({
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            },
            overview: {
                totalRevenue: totalRevenue,
                totalTicketsSold: tickets.length,
                totalEvents: userStats.eventsCreated || 0,
                totalAttendees: calculateTotalAttendees(tickets),
                conversionRate: calculateConversionRate(tickets, orders)
            },
            revenue: {
                total: totalRevenue,
                monthly: monthlyRevenue,
                byEvent: eventPerformance.revenue
            },
            events: {
                total: userStats.eventsCreated || 0,
                performance: eventPerformance.events,
                topPerforming: topEvents
            },
            attendance: attendanceData,
            ticketSales: ticketSales,
            audience: audienceInsights,
            trends: {
                salesTrend: calculateSalesTrend(orders),
                attendanceTrend: calculateAttendanceTrend(tickets),
                revenueGrowth: calculateRevenueGrowth(orders)
            }
        });

    } catch (error) {
        console.error('Error getting analytics data:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve analytics data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get event-specific analytics
router.get('/events/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;
        
        console.log(`Getting event analytics for event ${eventId}, user: ${userId}`);

        // Get event details
        const event = await db.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get tickets for this event
        const tickets = await db.getUserTickets(userId);
        const eventTickets = tickets.filter(ticket => ticket.eventId === eventId);
        
        // Get orders for this event
        const orders = await db.getUserOrders(userId);
        const eventOrders = orders.filter(order => 
            order.items.some(item => item.eventId === eventId)
        );

        // Calculate event-specific metrics
        const eventAnalytics = {
            event: {
                id: event.id,
                title: event.title,
                date: event.startDate,
                location: event.location
            },
            tickets: {
                sold: eventTickets.length,
                revenue: eventTickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0),
                types: calculateTicketTypeDistribution(eventTickets)
            },
            attendance: {
                confirmed: eventTickets.filter(t => t.status === 'confirmed').length,
                pending: eventTickets.filter(t => t.status === 'pending').length,
                cancelled: eventTickets.filter(t => t.status === 'cancelled').length
            },
            demographics: calculateEventDemographics(eventTickets),
            timeline: calculateEventTimeline(eventOrders, eventTickets)
        };

        res.json({
            success: true,
            analytics: eventAnalytics
        });

    } catch (error) {
        console.error('Error getting event analytics:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve event analytics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get revenue analytics
router.get('/revenue', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
        
        console.log(`Getting revenue analytics for user: ${userId}, period: ${period}`);

        const orders = await db.getUserOrders(userId);
        
        // Filter orders based on period
        const filteredOrders = filterOrdersByPeriod(orders, period);
        
        const revenueAnalytics = {
            period: period,
            total: filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0),
            daily: calculateDailyRevenue(filteredOrders, period),
            bySource: calculateRevenueBySource(filteredOrders),
            growth: calculateRevenueGrowthRate(orders, period),
            forecast: generateRevenueForecast(orders)
        };

        res.json({
            success: true,
            revenue: revenueAnalytics
        });

    } catch (error) {
        console.error('Error getting revenue analytics:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve revenue analytics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Helper functions
function calculateMonthlyRevenue(orders) {
    const monthlyData = {};
    orders.forEach(order => {
        const month = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + (order.total || 0);
    });
    
    return Object.entries(monthlyData).map(([month, revenue]) => ({
        month,
        revenue
    }));
}

function calculateEventPerformance(tickets, orders) {
    const eventMap = {};
    
    tickets.forEach(ticket => {
        if (!eventMap[ticket.eventId]) {
            eventMap[ticket.eventId] = {
                eventId: ticket.eventId,
                eventTitle: ticket.eventTitle,
                ticketsSold: 0,
                revenue: 0
            };
        }
        eventMap[ticket.eventId].ticketsSold++;
        eventMap[ticket.eventId].revenue += ticket.price || 0;
    });
    
    return {
        events: Object.values(eventMap),
        revenue: Object.values(eventMap).map(event => ({
            eventTitle: event.eventTitle,
            revenue: event.revenue
        }))
    };
}

function calculateAttendanceData(tickets) {
    const attendanceByMonth = {};
    tickets.forEach(ticket => {
        const month = new Date(ticket.eventDate).toISOString().slice(0, 7);
        attendanceByMonth[month] = (attendanceByMonth[month] || 0) + (ticket.quantity || 1);
    });
    
    return {
        total: tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0),
        monthly: Object.entries(attendanceByMonth).map(([month, count]) => ({
            month,
            attendees: count
        })),
        byStatus: {
            confirmed: tickets.filter(t => t.status === 'confirmed').length,
            pending: tickets.filter(t => t.status === 'pending').length
        }
    };
}

function calculateTicketSales(tickets) {
    const salesByType = {};
    tickets.forEach(ticket => {
        const type = ticket.type || 'General Admission';
        salesByType[type] = (salesByType[type] || 0) + (ticket.quantity || 1);
    });
    
    return {
        total: tickets.length,
        byType: Object.entries(salesByType).map(([type, count]) => ({
            type,
            count
        })),
        revenue: tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0)
    };
}

function getTopPerformingEvents(tickets, orders) {
    const eventPerformance = {};
    
    tickets.forEach(ticket => {
        if (!eventPerformance[ticket.eventId]) {
            eventPerformance[ticket.eventId] = {
                eventId: ticket.eventId,
                eventTitle: ticket.eventTitle,
                ticketsSold: 0,
                revenue: 0,
                eventDate: ticket.eventDate
            };
        }
        eventPerformance[ticket.eventId].ticketsSold += ticket.quantity || 1;
        eventPerformance[ticket.eventId].revenue += ticket.price || 0;
    });
    
    return Object.values(eventPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
}

function calculateAudienceInsights(user, tickets) {
    // Mock audience insights based on ticket data
    return {
        totalAudience: tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0),
        demographics: {
            ageGroups: [
                { group: '18-24', percentage: 25 },
                { group: '25-34', percentage: 35 },
                { group: '35-44', percentage: 25 },
                { group: '45+', percentage: 15 }
            ],
            interests: [
                { category: 'Technology', percentage: 40 },
                { category: 'Business', percentage: 30 },
                { category: 'Arts', percentage: 20 },
                { category: 'Sports', percentage: 10 }
            ]
        },
        retention: {
            returningCustomers: Math.floor(tickets.length * 0.3),
            newCustomers: Math.floor(tickets.length * 0.7)
        }
    };
}

function calculateTotalAttendees(tickets) {
    return tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0);
}

function calculateConversionRate(tickets, orders) {
    if (orders.length === 0) return 0;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    return ((completedOrders / orders.length) * 100).toFixed(2);
}

function calculateSalesTrend(orders) {
    const last30Days = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
    });
    
    return last30Days.length > 0 ? 'up' : 'stable';
}

function calculateAttendanceTrend(tickets) {
    const last30Days = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.purchaseDate || ticket.createdAt);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return ticketDate >= thirtyDaysAgo;
    });
    
    return last30Days.length > 0 ? 'up' : 'stable';
}

function calculateRevenueGrowth(orders) {
    // Simple growth calculation
    const thisMonth = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });
    
    const lastMonth = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return orderDate.getMonth() === lastMonthDate.getMonth() && orderDate.getFullYear() === lastMonthDate.getFullYear();
    });
    
    const thisMonthRevenue = thisMonth.reduce((sum, order) => sum + (order.total || 0), 0);
    const lastMonthRevenue = lastMonth.reduce((sum, order) => sum + (order.total || 0), 0);
    
    if (lastMonthRevenue === 0) return 0;
    return (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(2);
}

function filterOrdersByPeriod(orders, period) {
    const now = new Date();
    let cutoffDate;
    
    switch(period) {
        case '7d':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return orders.filter(order => new Date(order.createdAt) >= cutoffDate);
}

function calculateDailyRevenue(orders, period) {
    const dailyRevenue = {};
    orders.forEach(order => {
        const date = new Date(order.createdAt).toISOString().slice(0, 10);
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total || 0);
    });
    
    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue
    }));
}

function calculateRevenueBySource(orders) {
    // Mock revenue by source
    const total = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    return [
        { source: 'Direct Sales', revenue: total * 0.6, percentage: 60 },
        { source: 'Partner Sales', revenue: total * 0.3, percentage: 30 },
        { source: 'Affiliate', revenue: total * 0.1, percentage: 10 }
    ];
}

function calculateRevenueGrowthRate(orders, period) {
    // Simple growth rate calculation
    return Math.floor(Math.random() * 20) + 5; // Mock 5-25% growth
}

function generateRevenueForecast(orders) {
    // Simple forecast based on historical data
    const avgRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0) / Math.max(orders.length, 1);
    return [
        { month: 'Next Month', projected: avgRevenue * 1.1 },
        { month: 'Month +2', projected: avgRevenue * 1.2 },
        { month: 'Month +3', projected: avgRevenue * 1.3 }
    ];
}

function calculateTicketTypeDistribution(tickets) {
    const typeDistribution = {};
    tickets.forEach(ticket => {
        const type = ticket.type || 'General Admission';
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    return Object.entries(typeDistribution).map(([type, count]) => ({
        type,
        count,
        percentage: ((count / tickets.length) * 100).toFixed(1)
    }));
}

function calculateEventDemographics(tickets) {
    // Mock demographics for event
    return {
        ageGroups: [
            { group: '18-24', count: Math.floor(tickets.length * 0.25) },
            { group: '25-34', count: Math.floor(tickets.length * 0.35) },
            { group: '35-44', count: Math.floor(tickets.length * 0.25) },
            { group: '45+', count: Math.floor(tickets.length * 0.15) }
        ],
        location: [
            { city: 'Lahore', count: Math.floor(tickets.length * 0.6) },
            { city: 'Karachi', count: Math.floor(tickets.length * 0.2) },
            { city: 'Islamabad', count: Math.floor(tickets.length * 0.15) },
            { city: 'Other', count: Math.floor(tickets.length * 0.05) }
        ]
    };
}

function calculateEventTimeline(orders, tickets) {
    const timeline = [];
    
    orders.forEach(order => {
        timeline.push({
            date: order.createdAt,
            type: 'order',
            description: `Order ${order.id} created`,
            value: order.total
        });
    });
    
    tickets.forEach(ticket => {
        timeline.push({
            date: ticket.purchaseDate || ticket.createdAt,
            type: 'ticket',
            description: `${ticket.quantity || 1} ticket(s) purchased`,
            value: ticket.price
        });
    });
    
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = router;