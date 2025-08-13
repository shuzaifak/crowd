const User = require('../database/models/User');

const requireAdmin = async (req, res, next) => {
    try {
        // First check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user from database to check admin status
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // User is admin, proceed
        req.admin = user;
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({ error: 'Server error during admin authentication' });
    }
};

module.exports = { requireAdmin };