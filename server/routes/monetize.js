const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const PartnershipApplication = require('../database/models/PartnershipApplication');
const User = require('../database/models/User');

// Get all partnership applications (admin only)
router.get('/applications', authenticateToken, requireAdmin, async (req, res) => {
    try {

        const { type, status, page = 1, limit = 20 } = req.query;
        const query = {};
        
        if (type) query.applicationType = type;
        if (status) query.status = status;

        const applications = await PartnershipApplication
            .find(query)
            .populate('userId', 'email username')
            .sort({ submissionDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await PartnershipApplication.countDocuments(query);

        res.json({
            applications,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Get user's partnership applications
router.get('/my-applications', authenticateToken, async (req, res) => {
    try {
        const applications = await PartnershipApplication
            .find({ userId: req.user.id })
            .sort({ submissionDate: -1 });

        res.json({ applications });
    } catch (error) {
        console.error('Error fetching user applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Submit influencer application
router.post('/apply/influencer', authenticateToken, async (req, res) => {
    try {
        const {
            contactInfo,
            businessInfo,
            influencerDetails
        } = req.body;

        // Check if user already has a pending influencer application
        const existingApp = await PartnershipApplication.findOne({
            userId: req.user.id,
            applicationType: 'influencer',
            status: { $in: ['pending', 'under_review'] }
        });

        if (existingApp) {
            return res.status(400).json({ 
                error: 'You already have a pending influencer application' 
            });
        }

        // Validate required fields
        if (!contactInfo?.email || !contactInfo?.phone || !contactInfo?.fullName) {
            return res.status(400).json({ error: 'Contact information is required' });
        }

        if (!businessInfo?.businessName) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        if (!influencerDetails?.niche) {
            return res.status(400).json({ error: 'Influencer niche is required' });
        }

        const application = new PartnershipApplication({
            userId: req.user.id,
            applicationType: 'influencer',
            contactInfo,
            businessInfo,
            influencerDetails,
            status: 'pending'
        });

        await application.save();

        res.status(201).json({ 
            message: 'Influencer application submitted successfully',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Error submitting influencer application:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Submit venue application
router.post('/apply/venue', authenticateToken, async (req, res) => {
    try {
        const {
            contactInfo,
            businessInfo,
            venueDetails
        } = req.body;

        // Check if user already has a pending venue application
        const existingApp = await PartnershipApplication.findOne({
            userId: req.user.id,
            applicationType: 'venue',
            status: { $in: ['pending', 'under_review'] }
        });

        if (existingApp) {
            return res.status(400).json({ 
                error: 'You already have a pending venue application' 
            });
        }

        // Validate required fields
        if (!contactInfo?.email || !contactInfo?.phone || !contactInfo?.fullName) {
            return res.status(400).json({ error: 'Contact information is required' });
        }

        if (!businessInfo?.businessName) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        if (!venueDetails?.venueType || !venueDetails?.location?.address) {
            return res.status(400).json({ error: 'Venue type and address are required' });
        }

        const application = new PartnershipApplication({
            userId: req.user.id,
            applicationType: 'venue',
            contactInfo,
            businessInfo,
            venueDetails,
            status: 'pending'
        });

        await application.save();

        res.status(201).json({ 
            message: 'Venue application submitted successfully',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Error submitting venue application:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Get specific application
router.get('/application/:id', authenticateToken, async (req, res) => {
    try {
        const application = await PartnershipApplication
            .findById(req.params.id)
            .populate('userId', 'email username');

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Check if user owns this application or is admin
        const user = await User.findById(req.user.id);
        if (application.userId._id.toString() !== req.user.id && !user?.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ application });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

// Update application status (admin only)
router.patch('/application/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {

        const { status, notes, partnershipTerms } = req.body;
        const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'needs_info'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const application = await PartnershipApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        await application.updateStatus(status, notes);

        if (status === 'approved' && partnershipTerms) {
            application.partnershipTerms = partnershipTerms;
            await application.save();
        }

        res.json({ 
            message: `Application ${status} successfully`,
            application 
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
});

// Add document to application
router.post('/application/:id/document', authenticateToken, async (req, res) => {
    try {
        const { name, url, type } = req.body;
        
        const application = await PartnershipApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Check if user owns this application
        if (application.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await application.addDocument(name, url, type);

        res.json({ 
            message: 'Document added successfully',
            application 
        });
    } catch (error) {
        console.error('Error adding document:', error);
        res.status(500).json({ error: 'Failed to add document' });
    }
});

// Get application statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {

        const stats = await PartnershipApplication.aggregate([
            {
                $group: {
                    _id: {
                        type: '$applicationType',
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    statuses: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    },
                    total: { $sum: '$count' }
                }
            }
        ]);

        const totalApplications = await PartnershipApplication.countDocuments();
        const pendingApplications = await PartnershipApplication.countDocuments({ status: 'pending' });
        const approvedApplications = await PartnershipApplication.countDocuments({ status: 'approved' });

        res.json({
            totalApplications,
            pendingApplications,
            approvedApplications,
            byTypeAndStatus: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;