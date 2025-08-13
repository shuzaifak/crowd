const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

const router = express.Router();

// Get all available apps with categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let apps = await db.getAllApps();
    
    // Filter by category if provided
    if (category && category !== 'all') {
      apps = apps.filter(app => app.category === category);
    }
    
    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      apps = apps.filter(app => 
        app.name.toLowerCase().includes(searchTerm) ||
        app.description.toLowerCase().includes(searchTerm) ||
        app.category.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({
      success: true,
      apps,
      categories: await db.getAppCategories()
    });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// Get user's installed apps
router.get('/installed', authenticateToken, async (req, res) => {
  try {
    const userApps = await db.getUserInstalledApps(req.user.id);
    res.json({
      success: true,
      apps: userApps
    });
  } catch (error) {
    console.error('Error fetching user apps:', error);
    res.status(500).json({ error: 'Failed to fetch installed apps' });
  }
});

// Install/Get an app
router.post('/:appId/install', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params;
    const userId = req.user.id;
    
    // Check if app exists
    const app = await db.getAppById(appId);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Check if already installed
    const isInstalled = await db.isAppInstalled(userId, appId);
    if (isInstalled) {
      return res.status(409).json({ error: 'App already installed' });
    }
    
    // Install the app
    const result = await db.installApp(userId, appId);
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to install app' });
    }
    
    res.json({
      success: true,
      message: 'App installed successfully',
      installation: result.installation
    });
  } catch (error) {
    console.error('Error installing app:', error);
    res.status(500).json({ error: 'Failed to install app' });
  }
});

// Uninstall an app
router.delete('/:appId/uninstall', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params;
    const userId = req.user.id;
    
    const result = await db.uninstallApp(userId, appId);
    if (!result.success) {
      return res.status(404).json({ error: result.error || 'App not found or not installed' });
    }
    
    res.json({
      success: true,
      message: 'App uninstalled successfully'
    });
  } catch (error) {
    console.error('Error uninstalling app:', error);
    res.status(500).json({ error: 'Failed to uninstall app' });
  }
});

// Get app details
router.get('/:appId', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params;
    const userId = req.user.id;
    
    const app = await db.getAppById(appId);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const isInstalled = await db.isAppInstalled(userId, appId);
    
    res.json({
      success: true,
      app: {
        ...app,
        isInstalled
      }
    });
  } catch (error) {
    console.error('Error fetching app details:', error);
    res.status(500).json({ error: 'Failed to fetch app details' });
  }
});

// Get app categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const categories = await db.getAppCategories();
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Rate an app
router.post('/:appId/rate', authenticateToken, async (req, res) => {
  try {
    const ratingSchema = Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      review: Joi.string().max(500).optional()
    });
    
    const { error, value } = ratingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { appId } = req.params;
    const userId = req.user.id;
    const { rating, review } = value;
    
    const result = await db.rateApp(userId, appId, rating, review);
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to rate app' });
    }
    
    res.json({
      success: true,
      message: 'App rated successfully',
      rating: result.rating
    });
  } catch (error) {
    console.error('Error rating app:', error);
    res.status(500).json({ error: 'Failed to rate app' });
  }
});

module.exports = router;