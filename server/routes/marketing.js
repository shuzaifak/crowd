const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get user's marketing campaigns
router.get('/campaigns', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting marketing campaigns for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's campaigns (stored in user object or separate collection)
        const campaigns = user.marketingCampaigns || [];

        res.json({
            success: true,
            campaigns: campaigns,
            count: campaigns.length
        });

    } catch (error) {
        console.error('Error getting marketing campaigns:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve campaigns',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Create new marketing campaign
router.post('/campaigns', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignData = req.body;

        console.log(`Creating marketing campaign for user: ${userId}`);

        // Validate campaign data
        if (!campaignData.title || !campaignData.type) {
            return res.status(400).json({ error: 'Campaign title and type are required' });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create new campaign
        const newCampaign = {
            id: 'campaign_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            title: campaignData.title,
            type: campaignData.type, // 'email', 'social', 'paid-ad'
            status: 'draft',
            content: campaignData.content || '',
            targetAudience: campaignData.targetAudience || 'all',
            scheduledDate: campaignData.scheduledDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                sent: 0,
                opened: 0,
                clicked: 0,
                conversions: 0
            }
        };

        // Initialize campaigns array if it doesn't exist
        if (!user.marketingCampaigns) {
            user.marketingCampaigns = [];
        }

        // Add campaign to user's campaigns
        user.marketingCampaigns.push(newCampaign);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            marketingCampaigns: user.marketingCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Campaign created successfully',
            campaign: newCampaign
        });

    } catch (error) {
        console.error('Error creating marketing campaign:', error);
        res.status(500).json({ 
            error: 'Failed to create campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Update marketing campaign
router.put('/campaigns/:campaignId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignId = req.params.campaignId;
        const updateData = req.body;

        console.log(`Updating campaign ${campaignId} for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user || !user.marketingCampaigns) {
            return res.status(404).json({ error: 'User or campaigns not found' });
        }

        // Find and update campaign
        const campaignIndex = user.marketingCampaigns.findIndex(c => c.id === campaignId);
        if (campaignIndex === -1) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Update campaign
        user.marketingCampaigns[campaignIndex] = {
            ...user.marketingCampaigns[campaignIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            marketingCampaigns: user.marketingCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Campaign updated successfully',
            campaign: user.marketingCampaigns[campaignIndex]
        });

    } catch (error) {
        console.error('Error updating marketing campaign:', error);
        res.status(500).json({ 
            error: 'Failed to update campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Delete marketing campaign
router.delete('/campaigns/:campaignId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignId = req.params.campaignId;

        console.log(`Deleting campaign ${campaignId} for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user || !user.marketingCampaigns) {
            return res.status(404).json({ error: 'User or campaigns not found' });
        }

        // Remove campaign
        user.marketingCampaigns = user.marketingCampaigns.filter(c => c.id !== campaignId);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            marketingCampaigns: user.marketingCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting marketing campaign:', error);
        res.status(500).json({ 
            error: 'Failed to delete campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Send marketing campaign
router.post('/campaigns/:campaignId/send', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignId = req.params.campaignId;

        console.log(`Sending campaign ${campaignId} for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user || !user.marketingCampaigns) {
            return res.status(404).json({ error: 'User or campaigns not found' });
        }

        // Find campaign
        const campaignIndex = user.marketingCampaigns.findIndex(c => c.id === campaignId);
        if (campaignIndex === -1) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = user.marketingCampaigns[campaignIndex];

        // Update campaign status to sent
        user.marketingCampaigns[campaignIndex] = {
            ...campaign,
            status: 'sent',
            sentAt: new Date().toISOString(),
            stats: {
                ...campaign.stats,
                sent: 1 // In real implementation, this would be the actual count
            }
        };

        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            marketingCampaigns: user.marketingCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Campaign sent successfully',
            campaign: user.marketingCampaigns[campaignIndex]
        });

    } catch (error) {
        console.error('Error sending marketing campaign:', error);
        res.status(500).json({ 
            error: 'Failed to send campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get social media stats
router.get('/social-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting social media stats for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get social media stats (mock data for now)
        const socialStats = user.socialMediaStats || {
            facebook: {
                followers: 245,
                posts: 12,
                engagement: 3.2
            },
            instagram: {
                followers: 892,
                posts: 45,
                engagement: 4.8
            },
            linkedin: {
                followers: 156,
                posts: 8,
                engagement: 2.1
            },
            tiktok: {
                followers: 1340,
                posts: 23,
                engagement: 7.6
            }
        };

        res.json({
            success: true,
            stats: socialStats
        });

    } catch (error) {
        console.error('Error getting social media stats:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve social stats',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Send social media post
router.post('/social-post', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const postData = req.body;

        console.log(`Sending social media post for user: ${userId}`);

        // Validate post data
        if (!postData.content || !postData.platforms) {
            return res.status(400).json({ error: 'Post content and platforms are required' });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create social media post record
        const socialPost = {
            id: 'post_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            content: postData.content,
            platforms: postData.platforms, // ['facebook', 'instagram', 'linkedin', 'tiktok']
            status: 'published',
            scheduledDate: postData.scheduledDate || null,
            createdAt: new Date().toISOString(),
            stats: {
                likes: 0,
                shares: 0,
                comments: 0,
                reach: 0
            }
        };

        // Initialize social posts array if it doesn't exist
        if (!user.socialMediaPosts) {
            user.socialMediaPosts = [];
        }

        // Add post to user's social posts
        user.socialMediaPosts.push(socialPost);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            socialMediaPosts: user.socialMediaPosts,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Social media post sent successfully',
            postId: socialPost.id,
            post: socialPost
        });

    } catch (error) {
        console.error('Error sending social media post:', error);
        res.status(500).json({ 
            error: 'Failed to send social post',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get marketing analytics
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting marketing analytics for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate analytics from campaigns and social posts
        const campaigns = user.marketingCampaigns || [];
        const socialPosts = user.socialMediaPosts || [];

        const analytics = {
            campaigns: {
                total: campaigns.length,
                sent: campaigns.filter(c => c.status === 'sent').length,
                draft: campaigns.filter(c => c.status === 'draft').length,
                scheduled: campaigns.filter(c => c.status === 'scheduled').length
            },
            socialMedia: {
                totalPosts: socialPosts.length,
                totalReach: socialPosts.reduce((sum, post) => sum + (post.stats.reach || 0), 0),
                totalEngagement: socialPosts.reduce((sum, post) => sum + (post.stats.likes || 0) + (post.stats.comments || 0) + (post.stats.shares || 0), 0)
            },
            email: {
                totalSent: campaigns.reduce((sum, c) => sum + (c.stats.sent || 0), 0),
                totalOpened: campaigns.reduce((sum, c) => sum + (c.stats.opened || 0), 0),
                totalClicked: campaigns.reduce((sum, c) => sum + (c.stats.clicked || 0), 0),
                openRate: 0, // Calculate based on sent/opened
                clickRate: 0 // Calculate based on opened/clicked
            }
        };

        // Calculate rates
        if (analytics.email.totalSent > 0) {
            analytics.email.openRate = ((analytics.email.totalOpened / analytics.email.totalSent) * 100).toFixed(2);
        }
        if (analytics.email.totalOpened > 0) {
            analytics.email.clickRate = ((analytics.email.totalClicked / analytics.email.totalOpened) * 100).toFixed(2);
        }

        res.json({
            success: true,
            analytics: analytics
        });

    } catch (error) {
        console.error('Error getting marketing analytics:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve analytics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get available targeting locations (temporary: no auth for testing)
router.get('/targeting/locations', async (req, res) => {
    try {
        const { query } = req.query;
        
        // Comprehensive location data for Pakistan and regions
        const locations = {
            countries: [
                {
                    id: 'PK',
                    name: 'Pakistan',
                    population: 225200000,
                    currency: 'PKR',
                    timezone: 'Asia/Karachi'
                }
            ],
            provinces: [
                {
                    id: 'PB',
                    name: 'Punjab',
                    country: 'PK',
                    population: 110000000,
                    major_cities: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala']
                },
                {
                    id: 'SD',
                    name: 'Sindh',
                    country: 'PK',
                    population: 48000000,
                    major_cities: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana']
                },
                {
                    id: 'KP',
                    name: 'Khyber Pakhtunkhwa',
                    country: 'PK',
                    population: 35000000,
                    major_cities: ['Peshawar', 'Mardan', 'Kohat', 'Bannu']
                },
                {
                    id: 'BL',
                    name: 'Balochistan',
                    country: 'PK',
                    population: 12000000,
                    major_cities: ['Quetta', 'Gwadar', 'Turbat']
                },
                {
                    id: 'GB',
                    name: 'Gilgit-Baltistan',
                    country: 'PK',
                    population: 1800000,
                    major_cities: ['Gilgit', 'Skardu']
                }
            ],
            cities: [
                // Punjab Cities
                {
                    id: 'lahore',
                    name: 'Lahore',
                    province: 'Punjab',
                    population: 11000000,
                    coordinates: { lat: 31.5204, lng: 74.3587 },
                    tier: 1,
                    digitalPenetration: 0.78
                },
                {
                    id: 'faisalabad',
                    name: 'Faisalabad',
                    province: 'Punjab',
                    population: 3200000,
                    coordinates: { lat: 31.4504, lng: 73.1350 },
                    tier: 2,
                    digitalPenetration: 0.65
                },
                {
                    id: 'rawalpindi',
                    name: 'Rawalpindi',
                    province: 'Punjab',
                    population: 2100000,
                    coordinates: { lat: 33.6844, lng: 73.0479 },
                    tier: 2,
                    digitalPenetration: 0.72
                },
                {
                    id: 'multan',
                    name: 'Multan',
                    province: 'Punjab',
                    population: 1900000,
                    coordinates: { lat: 30.1575, lng: 71.5249 },
                    tier: 2,
                    digitalPenetration: 0.61
                },
                {
                    id: 'gujranwala',
                    name: 'Gujranwala',
                    province: 'Punjab',
                    population: 2000000,
                    coordinates: { lat: 32.1877, lng: 74.1945 },
                    tier: 2,
                    digitalPenetration: 0.58
                },
                // Sindh Cities
                {
                    id: 'karachi',
                    name: 'Karachi',
                    province: 'Sindh',
                    population: 15400000,
                    coordinates: { lat: 24.8607, lng: 67.0011 },
                    tier: 1,
                    digitalPenetration: 0.82
                },
                {
                    id: 'hyderabad',
                    name: 'Hyderabad',
                    province: 'Sindh',
                    population: 1700000,
                    coordinates: { lat: 25.3960, lng: 68.3578 },
                    tier: 2,
                    digitalPenetration: 0.67
                },
                // KPK Cities
                {
                    id: 'peshawar',
                    name: 'Peshawar',
                    province: 'Khyber Pakhtunkhwa',
                    population: 2000000,
                    coordinates: { lat: 34.0151, lng: 71.5249 },
                    tier: 2,
                    digitalPenetration: 0.54
                },
                // Capital
                {
                    id: 'islamabad',
                    name: 'Islamabad',
                    province: 'Federal Capital Territory',
                    population: 1100000,
                    coordinates: { lat: 33.6844, lng: 73.0479 },
                    tier: 1,
                    digitalPenetration: 0.89
                },
                // Balochistan
                {
                    id: 'quetta',
                    name: 'Quetta',
                    province: 'Balochistan',
                    population: 1000000,
                    coordinates: { lat: 30.1798, lng: 66.9750 },
                    tier: 3,
                    digitalPenetration: 0.43
                }
            ],
            districts: [
                // Sample districts - can be expanded
                {
                    id: 'lahore_district',
                    name: 'Lahore District',
                    city: 'lahore',
                    population: 11000000,
                    areas: ['DHA', 'Gulberg', 'Model Town', 'Johar Town', 'Garden Town']
                },
                {
                    id: 'karachi_central',
                    name: 'Central Karachi',
                    city: 'karachi',
                    population: 3500000,
                    areas: ['Gulshan', 'North Nazimabad', 'Nazimabad', 'Federal B Area']
                }
            ]
        };

        // Filter based on query if provided
        let filteredLocations = locations;
        if (query) {
            const searchTerm = query.toLowerCase();
            filteredLocations = {
                countries: locations.countries.filter(c => 
                    c.name.toLowerCase().includes(searchTerm)
                ),
                provinces: locations.provinces.filter(p => 
                    p.name.toLowerCase().includes(searchTerm)
                ),
                cities: locations.cities.filter(c => 
                    c.name.toLowerCase().includes(searchTerm) ||
                    c.province.toLowerCase().includes(searchTerm)
                ),
                districts: locations.districts.filter(d => 
                    d.name.toLowerCase().includes(searchTerm)
                )
            };
        }

        res.json({
            success: true,
            data: filteredLocations,
            meta: {
                totalCountries: filteredLocations.countries.length,
                totalProvinces: filteredLocations.provinces.length,
                totalCities: filteredLocations.cities.length,
                totalDistricts: filteredLocations.districts.length
            }
        });

    } catch (error) {
        console.error('Error getting targeting locations:', error);
        res.status(500).json({
            error: 'Failed to retrieve locations',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get demographic targeting options
router.get('/targeting/demographics', async (req, res) => {
    try {
        const demographics = {
            age_groups: [
                { id: '13-17', name: '13-17 years', min_age: 13, max_age: 17, estimated_reach: 8500000 },
                { id: '18-24', name: '18-24 years', min_age: 18, max_age: 24, estimated_reach: 25000000 },
                { id: '25-34', name: '25-34 years', min_age: 25, max_age: 34, estimated_reach: 35000000 },
                { id: '35-44', name: '35-44 years', min_age: 35, max_age: 44, estimated_reach: 28000000 },
                { id: '45-54', name: '45-54 years', min_age: 45, max_age: 54, estimated_reach: 22000000 },
                { id: '55-64', name: '55-64 years', min_age: 55, max_age: 64, estimated_reach: 15000000 },
                { id: '65+', name: '65+ years', min_age: 65, max_age: null, estimated_reach: 12000000 }
            ],
            genders: [
                { id: 'male', name: 'Male', estimated_reach: 115000000 },
                { id: 'female', name: 'Female', estimated_reach: 108000000 },
                { id: 'all', name: 'All genders', estimated_reach: 225000000 }
            ],
            income_levels: [
                { id: 'low', name: 'Low Income (< PKR 25,000/month)', min_income: 0, max_income: 25000, estimated_reach: 80000000 },
                { id: 'lower_middle', name: 'Lower Middle (PKR 25,000-50,000)', min_income: 25000, max_income: 50000, estimated_reach: 65000000 },
                { id: 'middle', name: 'Middle Class (PKR 50,000-100,000)', min_income: 50000, max_income: 100000, estimated_reach: 45000000 },
                { id: 'upper_middle', name: 'Upper Middle (PKR 100,000-200,000)', min_income: 100000, max_income: 200000, estimated_reach: 25000000 },
                { id: 'high', name: 'High Income (PKR 200,000+)', min_income: 200000, max_income: null, estimated_reach: 10000000 }
            ],
            education_levels: [
                { id: 'primary', name: 'Primary Education', estimated_reach: 45000000 },
                { id: 'secondary', name: 'Secondary Education', estimated_reach: 65000000 },
                { id: 'intermediate', name: 'Intermediate/A-Levels', estimated_reach: 35000000 },
                { id: 'bachelor', name: 'Bachelor\'s Degree', estimated_reach: 25000000 },
                { id: 'master', name: 'Master\'s Degree', estimated_reach: 15000000 },
                { id: 'doctorate', name: 'Doctorate/PhD', estimated_reach: 2000000 }
            ],
            languages: [
                { id: 'urdu', name: 'Urdu', estimated_reach: 180000000 },
                { id: 'punjabi', name: 'Punjabi', estimated_reach: 100000000 },
                { id: 'sindhi', name: 'Sindhi', estimated_reach: 30000000 },
                { id: 'pashto', name: 'Pashto', estimated_reach: 28000000 },
                { id: 'balochi', name: 'Balochi', estimated_reach: 8000000 },
                { id: 'english', name: 'English', estimated_reach: 35000000 }
            ],
            marital_status: [
                { id: 'single', name: 'Single', estimated_reach: 85000000 },
                { id: 'married', name: 'Married', estimated_reach: 125000000 },
                { id: 'divorced', name: 'Divorced', estimated_reach: 8000000 },
                { id: 'widowed', name: 'Widowed', estimated_reach: 7000000 }
            ],
            employment_status: [
                { id: 'employed', name: 'Employed', estimated_reach: 65000000 },
                { id: 'self_employed', name: 'Self-Employed', estimated_reach: 35000000 },
                { id: 'unemployed', name: 'Unemployed', estimated_reach: 25000000 },
                { id: 'student', name: 'Student', estimated_reach: 45000000 },
                { id: 'retired', name: 'Retired', estimated_reach: 15000000 },
                { id: 'homemaker', name: 'Homemaker', estimated_reach: 35000000 }
            ]
        };

        res.json({
            success: true,
            data: demographics,
            meta: {
                total_population: 225000000,
                last_updated: '2024-01-01'
            }
        });

    } catch (error) {
        console.error('Error getting demographic targeting:', error);
        res.status(500).json({
            error: 'Failed to retrieve demographics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get interest-based targeting options
router.get('/targeting/interests', async (req, res) => {
    try {
        const { category } = req.query;
        
        const interests = {
            lifestyle: [
                { id: 'fitness', name: 'Fitness & Health', estimated_reach: 15000000, engagement_rate: 4.2 },
                { id: 'food', name: 'Food & Dining', estimated_reach: 45000000, engagement_rate: 5.8 },
                { id: 'travel', name: 'Travel & Tourism', estimated_reach: 25000000, engagement_rate: 6.1 },
                { id: 'fashion', name: 'Fashion & Style', estimated_reach: 35000000, engagement_rate: 4.9 },
                { id: 'beauty', name: 'Beauty & Cosmetics', estimated_reach: 28000000, engagement_rate: 5.2 }
            ],
            entertainment: [
                { id: 'music', name: 'Music', estimated_reach: 55000000, engagement_rate: 7.3 },
                { id: 'movies', name: 'Movies & Cinema', estimated_reach: 48000000, engagement_rate: 6.8 },
                { id: 'tv_shows', name: 'TV Shows & Drama', estimated_reach: 65000000, engagement_rate: 6.2 },
                { id: 'gaming', name: 'Gaming', estimated_reach: 22000000, engagement_rate: 8.1 },
                { id: 'sports', name: 'Sports', estimated_reach: 42000000, engagement_rate: 7.9 },
                { id: 'comedy', name: 'Comedy', estimated_reach: 38000000, engagement_rate: 6.7 }
            ],
            technology: [
                { id: 'mobile_tech', name: 'Mobile Technology', estimated_reach: 35000000, engagement_rate: 5.4 },
                { id: 'social_media', name: 'Social Media', estimated_reach: 58000000, engagement_rate: 8.9 },
                { id: 'ecommerce', name: 'E-commerce', estimated_reach: 18000000, engagement_rate: 4.8 },
                { id: 'fintech', name: 'Financial Technology', estimated_reach: 12000000, engagement_rate: 3.9 },
                { id: 'digital_marketing', name: 'Digital Marketing', estimated_reach: 8000000, engagement_rate: 4.1 }
            ],
            business: [
                { id: 'entrepreneurship', name: 'Entrepreneurship', estimated_reach: 15000000, engagement_rate: 4.6 },
                { id: 'small_business', name: 'Small Business', estimated_reach: 25000000, engagement_rate: 3.8 },
                { id: 'real_estate', name: 'Real Estate', estimated_reach: 20000000, engagement_rate: 3.2 },
                { id: 'finance', name: 'Personal Finance', estimated_reach: 18000000, engagement_rate: 3.5 },
                { id: 'investing', name: 'Investing', estimated_reach: 8000000, engagement_rate: 4.3 }
            ],
            education: [
                { id: 'online_learning', name: 'Online Learning', estimated_reach: 28000000, engagement_rate: 5.1 },
                { id: 'professional_development', name: 'Professional Development', estimated_reach: 22000000, engagement_rate: 4.4 },
                { id: 'language_learning', name: 'Language Learning', estimated_reach: 15000000, engagement_rate: 4.8 },
                { id: 'skill_development', name: 'Skill Development', estimated_reach: 32000000, engagement_rate: 5.3 }
            ],
            hobbies: [
                { id: 'cooking', name: 'Cooking', estimated_reach: 38000000, engagement_rate: 6.4 },
                { id: 'photography', name: 'Photography', estimated_reach: 18000000, engagement_rate: 5.7 },
                { id: 'crafts', name: 'Arts & Crafts', estimated_reach: 15000000, engagement_rate: 4.9 },
                { id: 'gardening', name: 'Gardening', estimated_reach: 12000000, engagement_rate: 4.2 },
                { id: 'reading', name: 'Reading & Books', estimated_reach: 25000000, engagement_rate: 4.6 }
            ],
            religious_cultural: [
                { id: 'islamic_content', name: 'Islamic Content', estimated_reach: 185000000, engagement_rate: 8.2 },
                { id: 'cultural_events', name: 'Cultural Events', estimated_reach: 85000000, engagement_rate: 6.8 },
                { id: 'traditional_music', name: 'Traditional Music', estimated_reach: 45000000, engagement_rate: 5.9 },
                { id: 'festivals', name: 'Festivals & Celebrations', estimated_reach: 125000000, engagement_rate: 7.1 }
            ]
        };

        // Filter by category if specified
        let filteredInterests = interests;
        if (category && interests[category]) {
            filteredInterests = { [category]: interests[category] };
        }

        res.json({
            success: true,
            data: filteredInterests,
            categories: Object.keys(interests),
            meta: {
                total_interest_categories: Object.keys(interests).length,
                total_interests: Object.values(interests).flat().length
            }
        });

    } catch (error) {
        console.error('Error getting interest targeting:', error);
        res.status(500).json({
            error: 'Failed to retrieve interests',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get device and platform targeting options
router.get('/targeting/devices', async (req, res) => {
    try {
        const deviceData = {
            devices: [
                { id: 'mobile', name: 'Mobile Devices', estimated_reach: 180000000, market_share: 0.85 },
                { id: 'desktop', name: 'Desktop', estimated_reach: 25000000, market_share: 0.12 },
                { id: 'tablet', name: 'Tablet', estimated_reach: 8000000, market_share: 0.03 }
            ],
            operating_systems: [
                { id: 'android', name: 'Android', estimated_reach: 165000000, market_share: 0.82 },
                { id: 'ios', name: 'iOS', estimated_reach: 15000000, market_share: 0.08 },
                { id: 'windows', name: 'Windows', estimated_reach: 18000000, market_share: 0.09 },
                { id: 'other', name: 'Other', estimated_reach: 2000000, market_share: 0.01 }
            ],
            browsers: [
                { id: 'chrome', name: 'Google Chrome', estimated_reach: 145000000, market_share: 0.72 },
                { id: 'firefox', name: 'Mozilla Firefox', estimated_reach: 25000000, market_share: 0.12 },
                { id: 'safari', name: 'Safari', estimated_reach: 18000000, market_share: 0.09 },
                { id: 'edge', name: 'Microsoft Edge', estimated_reach: 12000000, market_share: 0.06 },
                { id: 'other', name: 'Other Browsers', estimated_reach: 2000000, market_share: 0.01 }
            ],
            connection_types: [
                { id: '4g', name: '4G/LTE', estimated_reach: 125000000, market_share: 0.62 },
                { id: '3g', name: '3G', estimated_reach: 45000000, market_share: 0.22 },
                { id: 'wifi', name: 'Wi-Fi', estimated_reach: 55000000, market_share: 0.27 },
                { id: 'broadband', name: 'Broadband', estimated_reach: 15000000, market_share: 0.07 }
            ]
        };

        res.json({
            success: true,
            data: deviceData,
            meta: {
                total_digital_population: 200000000,
                mobile_first_users: 0.89,
                last_updated: '2024-01-01'
            }
        });

    } catch (error) {
        console.error('Error getting device targeting:', error);
        res.status(500).json({
            error: 'Failed to retrieve device data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Create advanced ad campaign with detailed targeting
router.post('/campaigns/ads', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignData = req.body;

        console.log(`Creating ad campaign with targeting for user: ${userId}`);

        // Validate required campaign data
        if (!campaignData.title || !campaignData.objective || !campaignData.budget) {
            return res.status(400).json({ 
                error: 'Campaign title, objective, and budget are required' 
            });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create comprehensive ad campaign with targeting
        const adCampaign = {
            id: 'ad_campaign_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            title: campaignData.title,
            objective: campaignData.objective, // 'awareness', 'traffic', 'engagement', 'conversions', 'app_installs'
            type: 'paid_social_ads',
            status: 'draft',
            
            // Budget and bidding
            budget: {
                total: campaignData.budget.total,
                daily: campaignData.budget.daily,
                currency: campaignData.budget.currency || 'PKR',
                bidding_strategy: campaignData.budget.bidding_strategy || 'lowest_cost'
            },
            
            // Duration
            schedule: {
                start_date: campaignData.schedule?.start_date,
                end_date: campaignData.schedule?.end_date,
                timezone: campaignData.schedule?.timezone || 'Asia/Karachi',
                ad_scheduling: campaignData.schedule?.ad_scheduling || null // specific hours/days
            },
            
            // Creative assets
            creatives: {
                ad_format: campaignData.creatives?.ad_format || 'single_image', // 'single_image', 'carousel', 'video', 'slideshow'
                images: campaignData.creatives?.images || [],
                videos: campaignData.creatives?.videos || [],
                headline: campaignData.creatives?.headline || '',
                description: campaignData.creatives?.description || '',
                call_to_action: campaignData.creatives?.call_to_action || 'learn_more',
                landing_page: campaignData.creatives?.landing_page || ''
            },
            
            // Location targeting
            location_targeting: {
                countries: campaignData.targeting?.location?.countries || ['PK'],
                provinces: campaignData.targeting?.location?.provinces || [],
                cities: campaignData.targeting?.location?.cities || [],
                districts: campaignData.targeting?.location?.districts || [],
                radius_targeting: campaignData.targeting?.location?.radius_targeting || null, // { lat, lng, radius_km }
                exclude_locations: campaignData.targeting?.location?.exclude_locations || []
            },
            
            // Demographic targeting
            demographic_targeting: {
                age_range: {
                    min: campaignData.targeting?.demographics?.age_range?.min || 18,
                    max: campaignData.targeting?.demographics?.age_range?.max || 65
                },
                genders: campaignData.targeting?.demographics?.genders || ['all'],
                languages: campaignData.targeting?.demographics?.languages || ['urdu'],
                education_levels: campaignData.targeting?.demographics?.education_levels || [],
                income_levels: campaignData.targeting?.demographics?.income_levels || [],
                marital_status: campaignData.targeting?.demographics?.marital_status || [],
                employment_status: campaignData.targeting?.demographics?.employment_status || []
            },
            
            // Interest targeting
            interest_targeting: {
                interests: campaignData.targeting?.interests?.interests || [],
                behaviors: campaignData.targeting?.interests?.behaviors || [],
                custom_audiences: campaignData.targeting?.interests?.custom_audiences || [],
                lookalike_audiences: campaignData.targeting?.interests?.lookalike_audiences || []
            },
            
            // Device and platform targeting
            device_targeting: {
                devices: campaignData.targeting?.devices?.devices || ['mobile', 'desktop'],
                operating_systems: campaignData.targeting?.devices?.operating_systems || [],
                browsers: campaignData.targeting?.devices?.browsers || [],
                connection_types: campaignData.targeting?.devices?.connection_types || []
            },
            
            // Platform specific settings
            platforms: {
                facebook: {
                    enabled: campaignData.platforms?.facebook?.enabled || false,
                    placements: campaignData.platforms?.facebook?.placements || ['feed', 'stories'],
                    instagram_placements: campaignData.platforms?.facebook?.instagram_placements || []
                },
                google: {
                    enabled: campaignData.platforms?.google?.enabled || false,
                    network_types: campaignData.platforms?.google?.network_types || ['search', 'display'],
                    keywords: campaignData.platforms?.google?.keywords || []
                },
                youtube: {
                    enabled: campaignData.platforms?.youtube?.enabled || false,
                    ad_formats: campaignData.platforms?.youtube?.ad_formats || ['skippable_video']
                },
                tiktok: {
                    enabled: campaignData.platforms?.tiktok?.enabled || false,
                    placements: campaignData.platforms?.tiktok?.placements || ['feed']
                }
            },
            
            // Advanced targeting options
            advanced_targeting: {
                custom_audiences: campaignData.targeting?.advanced?.custom_audiences || [],
                excluded_audiences: campaignData.targeting?.advanced?.excluded_audiences || [],
                frequency_capping: campaignData.targeting?.advanced?.frequency_capping || null,
                attribution_window: campaignData.targeting?.advanced?.attribution_window || '7d_click_1d_view'
            },
            
            // Campaign metrics and tracking
            tracking: {
                conversion_events: campaignData.tracking?.conversion_events || [],
                utm_parameters: campaignData.tracking?.utm_parameters || {},
                pixel_ids: campaignData.tracking?.pixel_ids || []
            },
            
            // Performance data
            performance: {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                spend: 0,
                cpm: 0,
                cpc: 0,
                ctr: 0,
                conversion_rate: 0,
                roas: 0
            },
            
            // Estimated reach based on targeting
            estimated_reach: await calculateEstimatedReach(campaignData.targeting),
            
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Initialize ad campaigns array if it doesn't exist
        if (!user.adCampaigns) {
            user.adCampaigns = [];
        }

        user.adCampaigns.push(adCampaign);
        user.updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            adCampaigns: user.adCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Ad campaign created successfully',
            campaign: adCampaign,
            estimated_reach: adCampaign.estimated_reach
        });

    } catch (error) {
        console.error('Error creating ad campaign:', error);
        res.status(500).json({ 
            error: 'Failed to create ad campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get user's ad campaigns
router.get('/campaigns/ads', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, platform, objective } = req.query;
        
        console.log(`Getting ad campaigns for user: ${userId}`);

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let adCampaigns = user.adCampaigns || [];
        
        // Apply filters
        if (status) {
            adCampaigns = adCampaigns.filter(campaign => campaign.status === status);
        }
        if (objective) {
            adCampaigns = adCampaigns.filter(campaign => campaign.objective === objective);
        }
        if (platform) {
            adCampaigns = adCampaigns.filter(campaign => 
                campaign.platforms[platform]?.enabled === true
            );
        }

        // Calculate summary stats
        const summary = {
            total_campaigns: adCampaigns.length,
            active_campaigns: adCampaigns.filter(c => c.status === 'active').length,
            total_spend: adCampaigns.reduce((sum, c) => sum + (c.performance?.spend || 0), 0),
            total_impressions: adCampaigns.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0),
            total_clicks: adCampaigns.reduce((sum, c) => sum + (c.performance?.clicks || 0), 0),
            total_conversions: adCampaigns.reduce((sum, c) => sum + (c.performance?.conversions || 0), 0)
        };

        res.json({
            success: true,
            campaigns: adCampaigns,
            summary: summary,
            count: adCampaigns.length
        });

    } catch (error) {
        console.error('Error getting ad campaigns:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve ad campaigns',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Update ad campaign
router.put('/campaigns/ads/:campaignId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignId = req.params.campaignId;
        const updateData = req.body;

        console.log(`Updating ad campaign ${campaignId} for user: ${userId}`);

        const user = await db.getUserById(userId);
        if (!user || !user.adCampaigns) {
            return res.status(404).json({ error: 'User or campaigns not found' });
        }

        const campaignIndex = user.adCampaigns.findIndex(c => c.id === campaignId);
        if (campaignIndex === -1) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Recalculate estimated reach if targeting changed
        if (updateData.targeting) {
            updateData.estimated_reach = await calculateEstimatedReach(updateData.targeting);
        }

        // Update campaign
        user.adCampaigns[campaignIndex] = {
            ...user.adCampaigns[campaignIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        user.updatedAt = new Date().toISOString();

        await db.updateUser(userId, { 
            adCampaigns: user.adCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Ad campaign updated successfully',
            campaign: user.adCampaigns[campaignIndex]
        });

    } catch (error) {
        console.error('Error updating ad campaign:', error);
        res.status(500).json({ 
            error: 'Failed to update ad campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Estimate campaign reach
router.post('/campaigns/estimate-reach', async (req, res) => {
    try {
        const { targeting } = req.body;
        
        const estimatedReach = await calculateEstimatedReach(targeting);
        
        res.json({
            success: true,
            estimated_reach: estimatedReach
        });

    } catch (error) {
        console.error('Error estimating reach:', error);
        res.status(500).json({ 
            error: 'Failed to estimate reach',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Helper function to calculate estimated reach
async function calculateEstimatedReach(targeting) {
    try {
        let baseReach = 200000000; // Base Pakistan digital population
        let reachMultiplier = 1;
        
        // Location targeting
        if (targeting?.location) {
            if (targeting.location.cities && targeting.location.cities.length > 0) {
                // If specific cities are targeted, use their population
                const cityPopulations = {
                    'karachi': 15400000,
                    'lahore': 11000000,
                    'faisalabad': 3200000,
                    'rawalpindi': 2100000,
                    'multan': 1900000,
                    'hyderabad': 1700000,
                    'gujranwala': 2000000,
                    'peshawar': 2000000,
                    'islamabad': 1100000,
                    'quetta': 1000000
                };
                
                baseReach = targeting.location.cities.reduce((sum, city) => {
                    return sum + (cityPopulations[city.toLowerCase()] || 500000);
                }, 0);
            } else if (targeting.location.provinces && targeting.location.provinces.length > 0) {
                // If provinces are targeted
                const provincePopulations = {
                    'punjab': 110000000,
                    'sindh': 48000000,
                    'khyber pakhtunkhwa': 35000000,
                    'balochistan': 12000000,
                    'gilgit-baltistan': 1800000
                };
                
                baseReach = targeting.location.provinces.reduce((sum, province) => {
                    return sum + (provincePopulations[province.toLowerCase()] || 5000000);
                }, 0);
            }
        }

        // Age targeting
        if (targeting?.demographics?.age_range) {
            const ageMin = targeting.demographics.age_range.min || 18;
            const ageMax = targeting.demographics.age_range.max || 65;
            const ageRangeMultiplier = calculateAgeMultiplier(ageMin, ageMax);
            reachMultiplier *= ageRangeMultiplier;
        }

        // Gender targeting
        if (targeting?.demographics?.genders && !targeting.demographics.genders.includes('all')) {
            if (targeting.demographics.genders.includes('male') && targeting.demographics.genders.includes('female')) {
                reachMultiplier *= 1; // No reduction
            } else {
                reachMultiplier *= 0.52; // Approximately half
            }
        }

        // Interest targeting
        if (targeting?.interests?.interests && targeting.interests.interests.length > 0) {
            // Each additional interest reduces reach but increases relevance
            const interestMultiplier = Math.max(0.1, 1 - (targeting.interests.interests.length * 0.15));
            reachMultiplier *= interestMultiplier;
        }

        // Device targeting
        if (targeting?.devices?.devices && targeting.devices.devices.length > 0) {
            if (!targeting.devices.devices.includes('mobile')) {
                reachMultiplier *= 0.15; // Most users are mobile
            } else if (!targeting.devices.devices.includes('desktop')) {
                reachMultiplier *= 0.88; // Some desktop reduction
            }
        }

        const finalReach = Math.round(baseReach * reachMultiplier);
        
        return {
            minimum: Math.round(finalReach * 0.8),
            maximum: Math.round(finalReach * 1.2),
            estimated: finalReach,
            daily_active: Math.round(finalReach * 0.15),
            confidence_level: calculateConfidenceLevel(targeting)
        };
        
    } catch (error) {
        console.error('Error calculating reach:', error);
        return {
            minimum: 10000,
            maximum: 50000,
            estimated: 25000,
            daily_active: 3750,
            confidence_level: 'low'
        };
    }
}

function calculateAgeMultiplier(minAge, maxAge) {
    // Age distribution multipliers for Pakistan
    const ageMultipliers = {
        '13-17': 0.08,
        '18-24': 0.22,
        '25-34': 0.31,
        '35-44': 0.25,
        '45-54': 0.19,
        '55-64': 0.13,
        '65+': 0.10
    };
    
    let totalMultiplier = 0;
    
    if (minAge <= 17 && maxAge >= 13) totalMultiplier += ageMultipliers['13-17'];
    if (minAge <= 24 && maxAge >= 18) totalMultiplier += ageMultipliers['18-24'];
    if (minAge <= 34 && maxAge >= 25) totalMultiplier += ageMultipliers['25-34'];
    if (minAge <= 44 && maxAge >= 35) totalMultiplier += ageMultipliers['35-44'];
    if (minAge <= 54 && maxAge >= 45) totalMultiplier += ageMultipliers['45-54'];
    if (minAge <= 64 && maxAge >= 55) totalMultiplier += ageMultipliers['55-64'];
    if (maxAge >= 65) totalMultiplier += ageMultipliers['65+'];
    
    return Math.max(0.05, totalMultiplier);
}

function calculateConfidenceLevel(targeting) {
    let confidenceScore = 0;
    
    // Location targeting adds confidence
    if (targeting?.location?.cities?.length > 0) confidenceScore += 20;
    if (targeting?.location?.provinces?.length > 0) confidenceScore += 15;
    
    // Demographic targeting adds confidence
    if (targeting?.demographics?.age_range) confidenceScore += 15;
    if (targeting?.demographics?.genders?.length > 0) confidenceScore += 10;
    
    // Interest targeting adds confidence
    if (targeting?.interests?.interests?.length > 0) confidenceScore += 20;
    
    // Device targeting adds some confidence
    if (targeting?.devices?.devices?.length > 0) confidenceScore += 10;
    
    if (confidenceScore >= 70) return 'high';
    if (confidenceScore >= 40) return 'medium';
    return 'low';
}

// Location dropdown suggestions with search
router.get('/suggestions/locations', async (req, res) => {
    try {
        const { query, type, limit = 10 } = req.query;
        const searchTerm = query ? query.toLowerCase() : '';
        
        // Complete location database for suggestions
        const locationData = {
            countries: [
                { id: 'PK', name: 'Pakistan', type: 'country', population: 225200000 }
            ],
            provinces: [
                { id: 'punjab', name: 'Punjab', type: 'province', population: 110000000, country: 'Pakistan' },
                { id: 'sindh', name: 'Sindh', type: 'province', population: 48000000, country: 'Pakistan' },
                { id: 'kpk', name: 'Khyber Pakhtunkhwa', type: 'province', population: 35000000, country: 'Pakistan' },
                { id: 'balochistan', name: 'Balochistan', type: 'province', population: 12000000, country: 'Pakistan' },
                { id: 'gilgit', name: 'Gilgit-Baltistan', type: 'province', population: 1800000, country: 'Pakistan' }
            ],
            cities: [
                { id: 'karachi', name: 'Karachi', type: 'city', province: 'Sindh', population: 15400000, tier: 1 },
                { id: 'lahore', name: 'Lahore', type: 'city', province: 'Punjab', population: 11000000, tier: 1 },
                { id: 'faisalabad', name: 'Faisalabad', type: 'city', province: 'Punjab', population: 3200000, tier: 2 },
                { id: 'rawalpindi', name: 'Rawalpindi', type: 'city', province: 'Punjab', population: 2100000, tier: 2 },
                { id: 'multan', name: 'Multan', type: 'city', province: 'Punjab', population: 1900000, tier: 2 },
                { id: 'hyderabad', name: 'Hyderabad', type: 'city', province: 'Sindh', population: 1700000, tier: 2 },
                { id: 'gujranwala', name: 'Gujranwala', type: 'city', province: 'Punjab', population: 2000000, tier: 2 },
                { id: 'peshawar', name: 'Peshawar', type: 'city', province: 'Khyber Pakhtunkhwa', population: 2000000, tier: 2 },
                { id: 'islamabad', name: 'Islamabad', type: 'city', province: 'Federal Capital', population: 1100000, tier: 1 },
                { id: 'quetta', name: 'Quetta', type: 'city', province: 'Balochistan', population: 1000000, tier: 3 },
                { id: 'sialkot', name: 'Sialkot', type: 'city', province: 'Punjab', population: 655000, tier: 3 },
                { id: 'sargodha', name: 'Sargodha', type: 'city', province: 'Punjab', population: 659862, tier: 3 },
                { id: 'bahawalpur', name: 'Bahawalpur', type: 'city', province: 'Punjab', population: 762111, tier: 3 },
                { id: 'sukkur', name: 'Sukkur', type: 'city', province: 'Sindh', population: 499900, tier: 3 }
            ]
        };

        // Combine all locations for search
        let allLocations = [];
        if (!type || type === 'country') allLocations = allLocations.concat(locationData.countries);
        if (!type || type === 'province') allLocations = allLocations.concat(locationData.provinces);
        if (!type || type === 'city') allLocations = allLocations.concat(locationData.cities);

        // Filter by search term if provided
        if (searchTerm) {
            allLocations = allLocations.filter(location => 
                location.name.toLowerCase().includes(searchTerm) ||
                location.id.toLowerCase().includes(searchTerm) ||
                (location.province && location.province.toLowerCase().includes(searchTerm))
            );
        }

        // Sort by population (higher first) and limit results
        allLocations.sort((a, b) => (b.population || 0) - (a.population || 0));
        const suggestions = allLocations.slice(0, parseInt(limit));

        res.json({
            success: true,
            query: query || '',
            suggestions: suggestions.map(loc => ({
                id: loc.id,
                name: loc.name,
                type: loc.type,
                population: loc.population,
                display_text: `${loc.name}${loc.province ? `, ${loc.province}` : ''} (${(loc.population / 1000000).toFixed(1)}M)`,
                subtitle: `${loc.type} • ${(loc.population / 1000000).toFixed(1)}M people`,
                tier: loc.tier || null
            })),
            total_matches: allLocations.length,
            has_more: allLocations.length > parseInt(limit)
        });

    } catch (error) {
        console.error('Location suggestions error:', error);
        res.status(500).json({ error: 'Failed to get location suggestions' });
    }
});

// Demographics suggestions with search
router.get('/suggestions/demographics', async (req, res) => {
    try {
        const { category, query, limit = 10 } = req.query;
        const searchTerm = query ? query.toLowerCase() : '';

        const demographicsData = {
            age_groups: [
                { id: '13-17', name: '13-17 years', category: 'age', reach: 8500000, subtitle: '8.5M teens' },
                { id: '18-24', name: '18-24 years', category: 'age', reach: 25000000, subtitle: '25M young adults' },
                { id: '25-34', name: '25-34 years', category: 'age', reach: 35000000, subtitle: '35M millennials' },
                { id: '35-44', name: '35-44 years', category: 'age', reach: 28000000, subtitle: '28M professionals' },
                { id: '45-54', name: '45-54 years', category: 'age', reach: 22000000, subtitle: '22M middle-aged' },
                { id: '55-64', name: '55-64 years', category: 'age', reach: 15000000, subtitle: '15M pre-seniors' },
                { id: '65+', name: '65+ years', category: 'age', reach: 12000000, subtitle: '12M seniors' }
            ],
            genders: [
                { id: 'male', name: 'Male', category: 'gender', reach: 115000000, subtitle: '115M men' },
                { id: 'female', name: 'Female', category: 'gender', reach: 108000000, subtitle: '108M women' },
                { id: 'all', name: 'All genders', category: 'gender', reach: 225000000, subtitle: '225M people' }
            ],
            income_levels: [
                { id: 'low', name: 'Low Income', category: 'income', reach: 80000000, subtitle: '< PKR 25K/month • 80M people' },
                { id: 'lower_middle', name: 'Lower Middle Class', category: 'income', reach: 65000000, subtitle: 'PKR 25K-50K • 65M people' },
                { id: 'middle', name: 'Middle Class', category: 'income', reach: 45000000, subtitle: 'PKR 50K-100K • 45M people' },
                { id: 'upper_middle', name: 'Upper Middle Class', category: 'income', reach: 25000000, subtitle: 'PKR 100K-200K • 25M people' },
                { id: 'high', name: 'High Income', category: 'income', reach: 10000000, subtitle: 'PKR 200K+ • 10M people' }
            ],
            education: [
                { id: 'primary', name: 'Primary Education', category: 'education', reach: 45000000, subtitle: '45M people' },
                { id: 'secondary', name: 'Secondary Education', category: 'education', reach: 65000000, subtitle: '65M people' },
                { id: 'intermediate', name: 'Intermediate/A-Levels', category: 'education', reach: 35000000, subtitle: '35M people' },
                { id: 'bachelor', name: "Bachelor's Degree", category: 'education', reach: 25000000, subtitle: '25M graduates' },
                { id: 'master', name: "Master's Degree", category: 'education', reach: 15000000, subtitle: '15M postgraduates' },
                { id: 'doctorate', name: 'Doctorate/PhD', category: 'education', reach: 2000000, subtitle: '2M PhDs' }
            ],
            languages: [
                { id: 'urdu', name: 'Urdu', category: 'language', reach: 180000000, subtitle: 'National language • 180M speakers' },
                { id: 'punjabi', name: 'Punjabi', category: 'language', reach: 100000000, subtitle: 'Regional language • 100M speakers' },
                { id: 'sindhi', name: 'Sindhi', category: 'language', reach: 30000000, subtitle: 'Regional language • 30M speakers' },
                { id: 'pashto', name: 'Pashto', category: 'language', reach: 28000000, subtitle: 'Regional language • 28M speakers' },
                { id: 'english', name: 'English', category: 'language', reach: 35000000, subtitle: 'Business language • 35M speakers' },
                { id: 'balochi', name: 'Balochi', category: 'language', reach: 8000000, subtitle: 'Regional language • 8M speakers' }
            ]
        };

        let suggestions = [];
        
        // Filter by category if specified
        if (category && demographicsData[category]) {
            suggestions = demographicsData[category];
        } else {
            // Combine all demographics
            suggestions = Object.values(demographicsData).flat();
        }

        // Filter by search term if provided
        if (searchTerm) {
            suggestions = suggestions.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.id.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by reach (higher first) and limit
        suggestions.sort((a, b) => b.reach - a.reach);
        suggestions = suggestions.slice(0, parseInt(limit));

        res.json({
            success: true,
            query: query || '',
            category: category || 'all',
            suggestions: suggestions.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                reach: item.reach,
                display_text: item.name,
                subtitle: item.subtitle,
                icon: getIconForDemographic(item.category)
            })),
            available_categories: Object.keys(demographicsData),
            total_matches: suggestions.length
        });

    } catch (error) {
        console.error('Demographics suggestions error:', error);
        res.status(500).json({ error: 'Failed to get demographics suggestions' });
    }
});

// Interest suggestions with search and categories
router.get('/suggestions/interests', async (req, res) => {
    try {
        const { category, query, limit = 10 } = req.query;
        const searchTerm = query ? query.toLowerCase() : '';

        const interestsData = {
            lifestyle: [
                { id: 'fitness', name: 'Fitness & Health', reach: 15000000, engagement: 4.2 },
                { id: 'food', name: 'Food & Dining', reach: 45000000, engagement: 5.8 },
                { id: 'travel', name: 'Travel & Tourism', reach: 25000000, engagement: 6.1 },
                { id: 'fashion', name: 'Fashion & Style', reach: 35000000, engagement: 4.9 },
                { id: 'beauty', name: 'Beauty & Cosmetics', reach: 28000000, engagement: 5.2 }
            ],
            entertainment: [
                { id: 'music', name: 'Music', reach: 55000000, engagement: 7.3 },
                { id: 'movies', name: 'Movies & Cinema', reach: 48000000, engagement: 6.8 },
                { id: 'tv_shows', name: 'TV Shows & Drama', reach: 65000000, engagement: 6.2 },
                { id: 'gaming', name: 'Gaming', reach: 22000000, engagement: 8.1 },
                { id: 'sports', name: 'Sports', reach: 42000000, engagement: 7.9 },
                { id: 'comedy', name: 'Comedy', reach: 38000000, engagement: 6.7 }
            ],
            technology: [
                { id: 'mobile_tech', name: 'Mobile Technology', reach: 35000000, engagement: 5.4 },
                { id: 'social_media', name: 'Social Media', reach: 58000000, engagement: 8.9 },
                { id: 'ecommerce', name: 'E-commerce', reach: 18000000, engagement: 4.8 },
                { id: 'fintech', name: 'Financial Technology', reach: 12000000, engagement: 3.9 }
            ],
            business: [
                { id: 'entrepreneurship', name: 'Entrepreneurship', reach: 15000000, engagement: 4.6 },
                { id: 'small_business', name: 'Small Business', reach: 25000000, engagement: 3.8 },
                { id: 'real_estate', name: 'Real Estate', reach: 20000000, engagement: 3.2 },
                { id: 'investing', name: 'Investing', reach: 8000000, engagement: 4.3 }
            ]
        };

        let suggestions = [];

        // Filter by category if specified
        if (category && interestsData[category]) {
            suggestions = interestsData[category];
        } else {
            // Combine all interests
            suggestions = Object.values(interestsData).flat();
        }

        // Filter by search term
        if (searchTerm) {
            suggestions = suggestions.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.id.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by engagement rate and reach
        suggestions.sort((a, b) => (b.engagement * b.reach) - (a.engagement * a.reach));
        suggestions = suggestions.slice(0, parseInt(limit));

        res.json({
            success: true,
            query: query || '',
            category: category || 'all',
            suggestions: suggestions.map(item => ({
                id: item.id,
                name: item.name,
                reach: item.reach,
                engagement_rate: item.engagement,
                display_text: item.name,
                subtitle: `${(item.reach / 1000000).toFixed(1)}M people • ${item.engagement}% engagement`,
                category: findCategoryForInterest(item.id, interestsData),
                icon: getIconForInterest(item.id)
            })),
            available_categories: Object.keys(interestsData),
            total_matches: suggestions.length
        });

    } catch (error) {
        console.error('Interest suggestions error:', error);
        res.status(500).json({ error: 'Failed to get interest suggestions' });
    }
});

// Device suggestions
router.get('/suggestions/devices', async (req, res) => {
    try {
        const { type, query, limit = 10 } = req.query;
        const searchTerm = query ? query.toLowerCase() : '';

        const deviceData = {
            devices: [
                { id: 'mobile', name: 'Mobile Devices', reach: 180000000, share: 85, subtitle: '180M users • 85% market share' },
                { id: 'desktop', name: 'Desktop', reach: 25000000, share: 12, subtitle: '25M users • 12% market share' },
                { id: 'tablet', name: 'Tablet', reach: 8000000, share: 3, subtitle: '8M users • 3% market share' }
            ],
            operating_systems: [
                { id: 'android', name: 'Android', reach: 165000000, share: 82, subtitle: '165M users • 82% market share' },
                { id: 'ios', name: 'iOS', reach: 15000000, share: 8, subtitle: '15M users • 8% market share' },
                { id: 'windows', name: 'Windows', reach: 18000000, share: 9, subtitle: '18M users • 9% market share' }
            ],
            browsers: [
                { id: 'chrome', name: 'Google Chrome', reach: 145000000, share: 72, subtitle: '145M users • 72% market share' },
                { id: 'firefox', name: 'Mozilla Firefox', reach: 25000000, share: 12, subtitle: '25M users • 12% market share' },
                { id: 'safari', name: 'Safari', reach: 18000000, share: 9, subtitle: '18M users • 9% market share' }
            ]
        };

        let suggestions = [];

        if (type && deviceData[type]) {
            suggestions = deviceData[type];
        } else {
            suggestions = Object.values(deviceData).flat();
        }

        if (searchTerm) {
            suggestions = suggestions.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.id.toLowerCase().includes(searchTerm)
            );
        }

        suggestions.sort((a, b) => b.reach - a.reach);
        suggestions = suggestions.slice(0, parseInt(limit));

        res.json({
            success: true,
            query: query || '',
            type: type || 'all',
            suggestions: suggestions.map(item => ({
                id: item.id,
                name: item.name,
                reach: item.reach,
                market_share: item.share,
                display_text: item.name,
                subtitle: item.subtitle,
                icon: getIconForDevice(item.id)
            })),
            available_types: Object.keys(deviceData),
            total_matches: suggestions.length
        });

    } catch (error) {
        console.error('Device suggestions error:', error);
        res.status(500).json({ error: 'Failed to get device suggestions' });
    }
});

// Helper functions for icons
function getIconForDemographic(category) {
    const icons = {
        age: '👥',
        gender: '⚧️',
        income: '💰',
        education: '🎓',
        language: '🗣️'
    };
    return icons[category] || '📊';
}

function getIconForInterest(id) {
    const icons = {
        music: '🎵', movies: '🎬', gaming: '🎮', sports: '⚽',
        fitness: '💪', food: '🍽️', travel: '✈️', fashion: '👗',
        mobile_tech: '📱', social_media: '📱', ecommerce: '🛒'
    };
    return icons[id] || '❤️';
}

function getIconForDevice(id) {
    const icons = {
        mobile: '📱', desktop: '🖥️', tablet: '📱',
        android: '🤖', ios: '🍎', windows: '🪟',
        chrome: '🌐', firefox: '🦊', safari: '🧭'
    };
    return icons[id] || '💻';
}

function findCategoryForInterest(interestId, interestsData) {
    for (const [category, interests] of Object.entries(interestsData)) {
        if (interests.find(interest => interest.id === interestId)) {
            return category;
        }
    }
    return 'other';
}

// Test endpoint without authentication
router.get('/test-targeting', async (req, res) => {
    try {
        const testData = {
            locations: {
                cities: [
                    {
                        id: 'karachi',
                        name: 'Karachi',
                        province: 'Sindh',
                        population: 15400000,
                        coordinates: { lat: 24.8607, lng: 67.0011 },
                        tier: 1,
                        digitalPenetration: 0.82
                    },
                    {
                        id: 'lahore',
                        name: 'Lahore',
                        province: 'Punjab',
                        population: 11000000,
                        coordinates: { lat: 31.5204, lng: 74.3587 },
                        tier: 1,
                        digitalPenetration: 0.78
                    }
                ]
            },
            demographics: {
                age_groups: [
                    { id: '18-24', name: '18-24 years', estimated_reach: 25000000 },
                    { id: '25-34', name: '25-34 years', estimated_reach: 35000000 }
                ],
                genders: [
                    { id: 'male', name: 'Male', estimated_reach: 115000000 },
                    { id: 'female', name: 'Female', estimated_reach: 108000000 }
                ]
            },
            interests: {
                entertainment: [
                    { id: 'music', name: 'Music', estimated_reach: 55000000, engagement_rate: 7.3 },
                    { id: 'movies', name: 'Movies & Cinema', estimated_reach: 48000000, engagement_rate: 6.8 }
                ],
                technology: [
                    { id: 'mobile_tech', name: 'Mobile Technology', estimated_reach: 35000000, engagement_rate: 5.4 },
                    { id: 'social_media', name: 'Social Media', estimated_reach: 58000000, engagement_rate: 8.9 }
                ]
            },
            devices: {
                devices: [
                    { id: 'mobile', name: 'Mobile Devices', estimated_reach: 180000000, market_share: 0.85 },
                    { id: 'desktop', name: 'Desktop', estimated_reach: 25000000, market_share: 0.12 }
                ]
            },
            campaign_estimate: {
                minimum: 800000,
                maximum: 1200000,
                estimated: 1000000,
                daily_active: 150000,
                confidence_level: 'high'
            }
        };

        res.json({
            success: true,
            message: 'Marketing targeting backend is working properly!',
            timestamp: new Date().toISOString(),
            data: testData,
            endpoints_available: [
                'GET /api/marketing/targeting/locations',
                'GET /api/marketing/targeting/demographics',
                'GET /api/marketing/targeting/interests',
                'GET /api/marketing/targeting/devices',
                'POST /api/marketing/campaigns/ads',
                'GET /api/marketing/campaigns/ads',
                'POST /api/marketing/campaigns/estimate-reach'
            ],
            features: [
                'Location targeting for Pakistan cities/provinces',
                'Demographic targeting (age, gender, income, education)',
                'Interest-based targeting across multiple categories',
                'Device and platform targeting',
                'Real-time reach estimation',
                'Multi-platform campaign management (Facebook, Google, YouTube, TikTok)',
                'Budget management and performance tracking'
            ]
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ error: 'Test endpoint failed' });
    }
});

// ========================================
// EMAIL & SMS CAMPAIGN SYSTEM
// ========================================

// Send email/SMS campaign to event attendees
router.post('/campaigns/:campaignId/send-notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignId = req.params.campaignId;
        const { type, eventId, message, scheduledTime } = req.body;

        console.log(`Sending ${type} notifications for campaign: ${campaignId}`);

        // Validate input
        if (!type || !eventId || !message) {
            return res.status(400).json({ 
                error: 'Type, event ID, and message are required' 
            });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the campaign
        const campaign = user.marketingCampaigns?.find(c => c.id === campaignId);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get event details
        const events = await db.getAllEvents();
        const event = events.find(e => e.id === eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Create notification record
        const notification = {
            id: 'notification_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            campaignId: campaignId,
            eventId: eventId,
            type: type, // 'email' or 'sms'
            message: message,
            status: scheduledTime ? 'scheduled' : 'sent',
            scheduledTime: scheduledTime || null,
            sentAt: scheduledTime ? null : new Date().toISOString(),
            createdAt: new Date().toISOString(),
            recipients: {
                total: event.currentAttendees || 0,
                sent: scheduledTime ? 0 : event.currentAttendees || 0,
                failed: 0,
                opened: 0,
                clicked: 0
            },
            eventDetails: {
                title: event.title,
                location: event.location,
                startDate: event.startDate,
                price: event.price,
                currency: event.currency
            }
        };

        // Add to user's notifications
        if (!user.marketingNotifications) {
            user.marketingNotifications = [];
        }
        user.marketingNotifications.push(notification);

        // Update campaign stats
        const campaignIndex = user.marketingCampaigns.findIndex(c => c.id === campaignId);
        if (campaignIndex !== -1) {
            if (!user.marketingCampaigns[campaignIndex].notifications) {
                user.marketingCampaigns[campaignIndex].notifications = 0;
            }
            user.marketingCampaigns[campaignIndex].notifications++;
            user.marketingCampaigns[campaignIndex].lastActivity = new Date().toISOString();
        }

        user.updatedAt = new Date().toISOString();

        await db.updateUser(userId, {
            marketingNotifications: user.marketingNotifications,
            marketingCampaigns: user.marketingCampaigns,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: `${type.toUpperCase()} campaign ${scheduledTime ? 'scheduled' : 'sent'} successfully`,
            notification: notification
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ 
            error: 'Failed to send notifications',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get notification history
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, status } = req.query;

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let notifications = user.marketingNotifications || [];

        // Apply filters
        if (type) {
            notifications = notifications.filter(n => n.type === type);
        }
        if (status) {
            notifications = notifications.filter(n => n.status === status);
        }

        // Sort by creation date (newest first)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            notifications: notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve notifications',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// ========================================
// TEAM/INFLUENCER TRACKING SYSTEM
// ========================================

// Create team member or influencer
router.post('/team-members', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, role, phone, specialization, commissionRate } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const teamMember = {
            id: 'team_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            name: name,
            email: email,
            role: role || 'promoter', // 'promoter', 'influencer', 'affiliate'
            phone: phone || null,
            specialization: specialization || null,
            commissionRate: commissionRate || 0.1, // 10% default
            isActive: true,
            uniqueCode: 'PROMO_' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            qrCodeUrl: null, // Will be generated
            stats: {
                totalReferrals: 0,
                totalSales: 0,
                totalCommission: 0,
                conversionRate: 0,
                lastActivity: null
            },
            createdAt: new Date().toISOString(),
            createdBy: userId
        };

        // Generate QR code data
        teamMember.qrCodeData = {
            code: teamMember.uniqueCode,
            url: `${req.protocol}://${req.get('host')}/referral/${teamMember.uniqueCode}`,
            expires: null // Never expires
        };

        if (!user.teamMembers) {
            user.teamMembers = [];
        }
        user.teamMembers.push(teamMember);
        user.updatedAt = new Date().toISOString();

        await db.updateUser(userId, {
            teamMembers: user.teamMembers,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Team member created successfully',
            teamMember: teamMember
        });

    } catch (error) {
        console.error('Error creating team member:', error);
        res.status(500).json({ 
            error: 'Failed to create team member',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get team members/influencers
router.get('/team-members', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { role, active } = req.query;

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let teamMembers = user.teamMembers || [];

        // Apply filters
        if (role) {
            teamMembers = teamMembers.filter(tm => tm.role === role);
        }
        if (active !== undefined) {
            teamMembers = teamMembers.filter(tm => tm.isActive === (active === 'true'));
        }

        // Calculate summary stats
        const summary = {
            totalMembers: teamMembers.length,
            activeMembers: teamMembers.filter(tm => tm.isActive).length,
            totalReferrals: teamMembers.reduce((sum, tm) => sum + (tm.stats?.totalReferrals || 0), 0),
            totalSales: teamMembers.reduce((sum, tm) => sum + (tm.stats?.totalSales || 0), 0),
            totalCommissions: teamMembers.reduce((sum, tm) => sum + (tm.stats?.totalCommission || 0), 0)
        };

        res.json({
            success: true,
            teamMembers: teamMembers,
            summary: summary,
            count: teamMembers.length
        });

    } catch (error) {
        console.error('Error getting team members:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve team members',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Track referral click/scan
router.post('/track-referral/:code', async (req, res) => {
    try {
        const referralCode = req.params.code;
        const { eventId, location, userAgent, ipAddress } = req.body;

        console.log(`Tracking referral for code: ${referralCode}`);

        // Find the team member by referral code
        const users = await db.getAllUsers();
        let teamMember = null;
        let organizer = null;

        for (const user of users) {
            if (user.teamMembers) {
                const member = user.teamMembers.find(tm => tm.uniqueCode === referralCode);
                if (member) {
                    teamMember = member;
                    organizer = user;
                    break;
                }
            }
        }

        if (!teamMember || !organizer) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Create tracking record
        const tracking = {
            id: 'track_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            referralCode: referralCode,
            teamMemberId: teamMember.id,
            eventId: eventId || null,
            timestamp: new Date().toISOString(),
            location: location || null,
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
            action: 'click', // 'click', 'scan', 'view'
            converted: false // Will be updated when sale happens
        };

        // Add to organizer's tracking records
        if (!organizer.referralTracking) {
            organizer.referralTracking = [];
        }
        organizer.referralTracking.push(tracking);

        // Update team member stats
        const teamMemberIndex = organizer.teamMembers.findIndex(tm => tm.id === teamMember.id);
        if (teamMemberIndex !== -1) {
            if (!organizer.teamMembers[teamMemberIndex].stats) {
                organizer.teamMembers[teamMemberIndex].stats = {
                    totalReferrals: 0,
                    totalSales: 0,
                    totalCommission: 0,
                    conversionRate: 0,
                    lastActivity: null
                };
            }
            organizer.teamMembers[teamMemberIndex].stats.totalReferrals++;
            organizer.teamMembers[teamMemberIndex].stats.lastActivity = new Date().toISOString();
        }

        organizer.updatedAt = new Date().toISOString();

        await db.updateUser(organizer.id, {
            teamMembers: organizer.teamMembers,
            referralTracking: organizer.referralTracking,
            updatedAt: organizer.updatedAt
        });

        res.json({
            success: true,
            message: 'Referral tracked successfully',
            teamMember: {
                name: teamMember.name,
                role: teamMember.role
            },
            eventUrl: eventId ? `/events/${eventId}` : '/events',
            tracking: tracking
        });

    } catch (error) {
        console.error('Error tracking referral:', error);
        res.status(500).json({ 
            error: 'Failed to track referral',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// ========================================
// SALES ATTRIBUTION & ANALYTICS
// ========================================

// Track sale attribution
router.post('/track-sale', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId, ticketsSold, totalAmount, source, referralCode, customerData } = req.body;

        if (!eventId || !ticketsSold || !totalAmount) {
            return res.status(400).json({ 
                error: 'Event ID, tickets sold, and total amount are required' 
            });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const sale = {
            id: 'sale_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            eventId: eventId,
            ticketsSold: ticketsSold,
            totalAmount: totalAmount,
            source: source || 'direct', // 'direct', 'social', 'referral', 'ads', 'email', 'sms'
            referralCode: referralCode || null,
            customerData: customerData || null,
            timestamp: new Date().toISOString(),
            commission: 0
        };

        // Calculate commission if referral
        if (referralCode) {
            const teamMember = user.teamMembers?.find(tm => tm.uniqueCode === referralCode);
            if (teamMember) {
                sale.commission = totalAmount * (teamMember.commissionRate || 0.1);
                sale.teamMemberId = teamMember.id;
                sale.teamMemberName = teamMember.name;
                
                // Update team member stats
                const teamMemberIndex = user.teamMembers.findIndex(tm => tm.id === teamMember.id);
                if (teamMemberIndex !== -1) {
                    user.teamMembers[teamMemberIndex].stats.totalSales += totalAmount;
                    user.teamMembers[teamMemberIndex].stats.totalCommission += sale.commission;
                    
                    // Update conversion rate
                    const totalReferrals = user.teamMembers[teamMemberIndex].stats.totalReferrals || 1;
                    const totalSales = (user.salesTracking || []).filter(s => s.referralCode === referralCode).length + 1;
                    user.teamMembers[teamMemberIndex].stats.conversionRate = (totalSales / totalReferrals) * 100;
                }
            }
        }

        // Add to sales tracking
        if (!user.salesTracking) {
            user.salesTracking = [];
        }
        user.salesTracking.push(sale);
        user.updatedAt = new Date().toISOString();

        await db.updateUser(userId, {
            salesTracking: user.salesTracking,
            teamMembers: user.teamMembers,
            updatedAt: user.updatedAt
        });

        res.json({
            success: true,
            message: 'Sale tracked successfully',
            sale: sale
        });

    } catch (error) {
        console.error('Error tracking sale:', error);
        res.status(500).json({ 
            error: 'Failed to track sale',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get sales attribution analytics
router.get('/analytics/attribution', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30', source, eventId } = req.query;

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const sales = user.salesTracking || [];
        const periodDays = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Filter sales by period
        let filteredSales = sales.filter(sale => new Date(sale.timestamp) >= startDate);

        // Apply additional filters
        if (source) {
            filteredSales = filteredSales.filter(sale => sale.source === source);
        }
        if (eventId) {
            filteredSales = filteredSales.filter(sale => sale.eventId === eventId);
        }

        // Calculate attribution breakdown
        const sourceBreakdown = {};
        const eventBreakdown = {};
        const referralBreakdown = {};
        
        let totalSales = 0;
        let totalTickets = 0;
        let totalCommissions = 0;

        filteredSales.forEach(sale => {
            // Source breakdown
            if (!sourceBreakdown[sale.source]) {
                sourceBreakdown[sale.source] = {
                    sales: 0,
                    tickets: 0,
                    revenue: 0,
                    percentage: 0
                };
            }
            sourceBreakdown[sale.source].sales++;
            sourceBreakdown[sale.source].tickets += sale.ticketsSold;
            sourceBreakdown[sale.source].revenue += sale.totalAmount;

            // Event breakdown
            if (!eventBreakdown[sale.eventId]) {
                eventBreakdown[sale.eventId] = {
                    sales: 0,
                    tickets: 0,
                    revenue: 0
                };
            }
            eventBreakdown[sale.eventId].sales++;
            eventBreakdown[sale.eventId].tickets += sale.ticketsSold;
            eventBreakdown[sale.eventId].revenue += sale.totalAmount;

            // Referral breakdown
            if (sale.referralCode && sale.teamMemberName) {
                if (!referralBreakdown[sale.referralCode]) {
                    referralBreakdown[sale.referralCode] = {
                        teamMemberName: sale.teamMemberName,
                        sales: 0,
                        tickets: 0,
                        revenue: 0,
                        commission: 0
                    };
                }
                referralBreakdown[sale.referralCode].sales++;
                referralBreakdown[sale.referralCode].tickets += sale.ticketsSold;
                referralBreakdown[sale.referralCode].revenue += sale.totalAmount;
                referralBreakdown[sale.referralCode].commission += sale.commission;
            }

            totalSales += sale.totalAmount;
            totalTickets += sale.ticketsSold;
            totalCommissions += sale.commission;
        });

        // Calculate percentages for source breakdown
        Object.keys(sourceBreakdown).forEach(source => {
            sourceBreakdown[source].percentage = totalSales > 0 ? 
                ((sourceBreakdown[source].revenue / totalSales) * 100).toFixed(2) : 0;
        });

        // Top performing sources
        const topSources = Object.entries(sourceBreakdown)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)
            .map(([source, data]) => ({ source, ...data }));

        // Top performing referrals
        const topReferrals = Object.entries(referralBreakdown)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10)
            .map(([code, data]) => ({ referralCode: code, ...data }));

        res.json({
            success: true,
            period: periodDays,
            summary: {
                totalSales: filteredSales.length,
                totalRevenue: totalSales,
                totalTickets: totalTickets,
                totalCommissions: totalCommissions,
                averageOrderValue: filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(2) : 0
            },
            attribution: {
                sources: sourceBreakdown,
                events: eventBreakdown,
                referrals: referralBreakdown
            },
            topPerformers: {
                sources: topSources,
                referrals: topReferrals
            }
        });

    } catch (error) {
        console.error('Error getting attribution analytics:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve analytics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get comprehensive marketing dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30' } = req.query;

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const periodDays = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Get recent data
        const recentSales = (user.salesTracking || []).filter(
            sale => new Date(sale.timestamp) >= startDate
        );
        const recentNotifications = (user.marketingNotifications || []).filter(
            notif => new Date(notif.createdAt) >= startDate
        );
        const activeTeamMembers = (user.teamMembers || []).filter(tm => tm.isActive);

        // Calculate metrics
        const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalTickets = recentSales.reduce((sum, sale) => sum + sale.ticketsSold, 0);
        const totalCommissions = recentSales.reduce((sum, sale) => sum + (sale.commission || 0), 0);
        
        const emailsSent = recentNotifications.filter(n => n.type === 'email').length;
        const smsSent = recentNotifications.filter(n => n.type === 'sms').length;
        
        const topPerformer = activeTeamMembers.reduce((top, member) => {
            const memberRevenue = member.stats?.totalSales || 0;
            return memberRevenue > (top.stats?.totalSales || 0) ? member : top;
        }, {});

        res.json({
            success: true,
            period: periodDays,
            metrics: {
                totalRevenue: totalRevenue,
                totalSales: recentSales.length,
                totalTickets: totalTickets,
                totalCommissions: totalCommissions,
                averageOrderValue: recentSales.length > 0 ? (totalRevenue / recentSales.length).toFixed(2) : 0,
                emailsSent: emailsSent,
                smsSent: smsSent,
                activeTeamMembers: activeTeamMembers.length,
                topPerformer: topPerformer.name || 'None'
            },
            recentActivity: {
                sales: recentSales.slice(0, 10),
                notifications: recentNotifications.slice(0, 5),
                teamMembers: activeTeamMembers.slice(0, 5)
            }
        });

    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve dashboard data',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Save campaign as draft (for ad campaigns page)
router.post('/campaigns/draft', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignData = req.body;
        
        console.log(`Saving campaign draft for user: ${userId}`);
        
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Create campaign with Facebook/Instagram ad structure
        const draftCampaign = {
            id: 'campaign_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            type: 'facebook_instagram_ads',
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Event information
            event: {
                id: campaignData.event?.id,
                title: campaignData.event?.title,
                date: campaignData.event?.date
            },
            
            // User information
            user: {
                id: campaignData.user?.id || userId,
                name: campaignData.user?.name,
                email: campaignData.user?.email
            },
            
            // Audience targeting
            audience: {
                sources: campaignData.audience?.sources || [],
                estimatedReach: campaignData.audience?.estimatedReach || { min: 0, max: 0 },
                smartTargeting: campaignData.audience?.smartTargeting || true
            },
            
            // Budget settings
            budget: {
                type: campaignData.budget?.type || 'daily',
                amount: campaignData.budget?.amount || 20,
                currency: campaignData.budget?.currency || 'USD'
            },
            
            // Creative content
            creative: {
                headline: campaignData.creative?.headline || '',
                description: campaignData.creative?.description || '',
                callToAction: campaignData.creative?.callToAction || 'Get Tickets',
                imageFile: null // File uploads would be handled separately
            },
            
            // Platform targeting
            targeting: {
                platforms: campaignData.targeting?.platforms || ['facebook', 'instagram'],
                placements: campaignData.targeting?.placements || ['feed'],
                optimization: campaignData.targeting?.optimization || 'link_clicks'
            }
        };
        
        // Initialize campaigns array if it doesn't exist
        if (!user.adCampaigns) {
            user.adCampaigns = [];
        }
        
        // Add draft campaign
        user.adCampaigns.push(draftCampaign);
        user.updatedAt = new Date().toISOString();
        
        // Update user in database
        await db.updateUser(userId, { 
            adCampaigns: user.adCampaigns,
            updatedAt: user.updatedAt
        });
        
        res.json({
            success: true,
            message: 'Campaign draft saved successfully',
            campaign: draftCampaign
        });
        
    } catch (error) {
        console.error('Error saving campaign draft:', error);
        res.status(500).json({ 
            error: 'Failed to save campaign draft',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Launch campaign (for ad campaigns page)
router.post('/campaigns/launch', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const campaignData = req.body;
        
        console.log(`Launching campaign for user: ${userId}`);
        
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Create launched campaign with full structure
        const launchedCampaign = {
            id: 'campaign_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            type: 'facebook_instagram_ads',
            status: 'active',
            createdAt: campaignData.createdAt || new Date().toISOString(),
            launchedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Event information
            event: campaignData.event,
            user: campaignData.user,
            audience: campaignData.audience,
            budget: campaignData.budget,
            creative: campaignData.creative,
            targeting: campaignData.targeting,
            
            // Performance tracking (initialized)
            performance: {
                impressions: 0,
                clicks: 0,
                spend: 0,
                conversions: 0,
                ctr: 0,
                cpc: 0,
                cpm: 0,
                lastUpdated: new Date().toISOString()
            },
            
            // Platform-specific data
            platforms: {
                facebook: {
                    campaign_id: null, // Would be set after actual Facebook API call
                    status: 'pending_review'
                },
                instagram: {
                    campaign_id: null,
                    status: 'pending_review'
                }
            }
        };
        
        // Initialize campaigns array if it doesn't exist
        if (!user.adCampaigns) {
            user.adCampaigns = [];
        }
        
        // Add launched campaign
        user.adCampaigns.push(launchedCampaign);
        user.updatedAt = new Date().toISOString();
        
        // Update user in database
        await db.updateUser(userId, { 
            adCampaigns: user.adCampaigns,
            updatedAt: user.updatedAt
        });
        
        // In a real implementation, this would make calls to Facebook/Instagram APIs
        // For now, we'll simulate successful launch
        
        res.json({
            success: true,
            message: 'Campaign launched successfully',
            campaign: launchedCampaign,
            next_steps: [
                'Your ads are now being reviewed by Facebook/Instagram',
                'You will receive email notifications about campaign status',
                'Performance data will be available within 24 hours'
            ]
        });
        
    } catch (error) {
        console.error('Error launching campaign:', error);
        res.status(500).json({ 
            error: 'Failed to launch campaign',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get audience suggestions for an event
router.get('/campaigns/audience-suggestions/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;
        
        console.log(`Getting audience suggestions for event ${eventId}, user: ${userId}`);
        
        // In a real implementation, this would analyze the event and user data
        // For now, return smart suggestions based on event type and user history
        const suggestions = [
            {
                id: 'website_visitors',
                name: 'Website visitors and engaged users',
                description: 'People who visited your event page or engaged with your content',
                estimated_size: 8500,
                type: 'custom_audience',
                confidence: 'high'
            },
            {
                id: 'past_attendees',
                name: 'Past attendees of similar events',
                description: 'People who have attended events in your category',
                estimated_size: 12300,
                type: 'lookalike_audience',
                confidence: 'high'
            },
            {
                id: 'email_subscribers',
                name: 'Email subscribers',
                description: 'People subscribed to your email lists',
                estimated_size: 3200,
                type: 'custom_audience',
                confidence: 'medium'
            },
            {
                id: 'facebook_fans',
                name: 'Facebook page fans and similar audiences',
                description: 'People who like your Facebook page and similar users',
                estimated_size: 25600,
                type: 'interests_audience',
                confidence: 'medium'
            }
        ];
        
        res.json({
            success: true,
            event_id: eventId,
            suggestions: suggestions,
            total_estimated_reach: suggestions.reduce((sum, s) => sum + s.estimated_size, 0)
        });
        
    } catch (error) {
        console.error('Error getting audience suggestions:', error);
        res.status(500).json({ 
            error: 'Failed to get audience suggestions',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get budget estimates
router.post('/campaigns/estimates', authenticateToken, async (req, res) => {
    try {
        const { eventId, audienceData, budget } = req.body;
        
        console.log(`Getting budget estimates for budget: ${budget}`);
        
        // Calculate estimates based on budget and audience size
        const dailyBudget = typeof budget === 'object' ? budget.amount : budget;
        const audienceSize = audienceData?.estimatedReach?.max || 50000;
        
        // Rough estimation formulas (would be more sophisticated in real implementation)
        const estimatedReach = {
            min: Math.floor(dailyBudget * 100),
            max: Math.floor(dailyBudget * 280)
        };
        
        const estimatedClicks = {
            min: Math.floor(dailyBudget * 2),
            max: Math.floor(dailyBudget * 5.6)
        };
        
        const estimatedCPC = {
            min: 0.18,
            max: 0.48
        };
        
        const estimatedTicketSales = {
            min: Math.floor(estimatedClicks.min * 0.2),
            max: Math.floor(estimatedClicks.max * 0.2)
        };
        
        res.json({
            success: true,
            estimates: {
                daily_budget: dailyBudget,
                reach: estimatedReach,
                clicks: estimatedClicks,
                cost_per_click: estimatedCPC,
                ticket_sales: estimatedTicketSales,
                audience_size: audienceSize
            },
            recommendations: [
                dailyBudget < 20 ? 'Consider increasing budget to $20+ for better performance' : null,
                audienceSize < 10000 ? 'Try expanding your audience for better reach' : null
            ].filter(Boolean)
        });
        
    } catch (error) {
        console.error('Error getting budget estimates:', error);
        res.status(500).json({ 
            error: 'Failed to get budget estimates',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Generate ad variations
router.post('/campaigns/generate-variations', authenticateToken, async (req, res) => {
    try {
        const { eventData, baseCreative } = req.body;
        
        console.log(`Generating ad variations for event: ${eventData?.title}`);
        
        // Generate variations based on the base creative
        const variations = [
            {
                id: 'variation_1',
                headline: baseCreative.headline,
                description: baseCreative.description,
                call_to_action: baseCreative.callToAction,
                type: 'original'
            },
            {
                id: 'variation_2',
                headline: `Don't Miss Out: ${baseCreative.headline}`,
                description: `Limited spots available! ${baseCreative.description}`,
                call_to_action: 'Register Now',
                type: 'urgency_focused'
            },
            {
                id: 'variation_3',
                headline: `Join Us: ${eventData?.title || baseCreative.headline}`,
                description: `Be part of something amazing. ${baseCreative.description}`,
                call_to_action: 'Learn More',
                type: 'community_focused'
            }
        ];
        
        res.json({
            success: true,
            variations: variations,
            recommendation: 'Test multiple variations to find the best performing ad'
        });
        
    } catch (error) {
        console.error('Error generating ad variations:', error);
        res.status(500).json({ 
            error: 'Failed to generate ad variations',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

module.exports = router;