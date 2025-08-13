const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting orders for user: ${userId}`);

        // Get user orders
        const orders = await db.getUserOrders(userId);

        res.json({
            success: true,
            orders: orders,
            count: orders.length
        });

    } catch (error) {
        console.error('Error getting user orders:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve orders',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get specific order details
router.get('/:orderId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.orderId;
        
        console.log(`Getting order ${orderId} for user: ${userId}`);

        // Get all user orders and find the specific one
        const orders = await db.getUserOrders(userId);
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            success: true,
            order: order
        });

    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve order details',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get user's tickets
router.get('/tickets/all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting tickets for user: ${userId}`);

        // Get user tickets
        const tickets = await db.getUserTickets(userId);

        res.json({
            success: true,
            tickets: tickets,
            count: tickets.length
        });

    } catch (error) {
        console.error('Error getting user tickets:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve tickets',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Create new order (for ticket purchase)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderData = req.body;

        console.log(`Creating new order for user: ${userId}`);

        // Validate order data
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }

        // Calculate total
        const total = orderData.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Create new order
        const newOrder = {
            id: 'order_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            userId: userId,
            total: total,
            status: orderData.status || 'pending',
            createdAt: new Date().toISOString(),
            items: orderData.items.map(item => ({
                eventId: item.eventId,
                eventTitle: item.eventTitle,
                ticketType: item.ticketType || 'General Admission',
                quantity: item.quantity,
                price: item.price
            }))
        };

        // In a real app, this would save to database
        // For now, we'll just return the created order
        
        res.json({
            success: true,
            message: 'Order created successfully',
            order: newOrder
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ 
            error: 'Failed to create order',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Update order status
router.put('/:orderId/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.orderId;
        const { status } = req.body;

        console.log(`Updating order ${orderId} status to ${status} for user: ${userId}`);

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Get user orders
        const orders = await db.getUserOrders(userId);
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status
        order.status = status;
        order.updatedAt = new Date().toISOString();

        // In a real app, this would update the database
        
        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: order
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            error: 'Failed to update order status',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Cancel order
router.delete('/:orderId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        console.log(`Cancelling order ${orderId} for user: ${userId}`);

        // Get user orders
        const orders = await db.getUserOrders(userId);
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel completed order' });
        }

        // Update order status to cancelled
        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();

        // In a real app, this would update the database
        
        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ 
            error: 'Failed to cancel order',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

module.exports = router;