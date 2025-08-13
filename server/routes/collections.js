const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Try to use MongoDB models, fallback to JSON files
let Collection, Event;
let useDatabase = true;

try {
  Collection = require('../database/models/Collection');
  Event = require('../database/models/Event');
} catch (error) {
  console.log('MongoDB models not available, using JSON files');
  useDatabase = false;
}

// Helper function to read JSON file
function readJSONFile(filename) {
  try {
    const filePath = path.join(__dirname, '../database/data', filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// Helper function to write JSON file
function writeJSONFile(filename, data) {
  try {
    const filePath = path.join(__dirname, '../database/data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

// Get all collections for a user
router.get('/', async (req, res) => {
  try {
    const { organizerId, status } = req.query;
    let collections;

    if (useDatabase) {
      let query = {};
      if (organizerId) query.organizerId = organizerId;
      if (status) query.status = status;
      
      collections = await Collection.find(query)
        .populate('events.eventId')
        .sort({ updatedAt: -1 });
    } else {
      // Use JSON file
      collections = readJSONFile('collections.json');
      
      // Filter by organizerId and status if provided
      if (organizerId) {
        collections = collections.filter(c => c.organizerId === organizerId);
      }
      if (status) {
        collections = collections.filter(c => c.status === status);
      }
      
      // Sort by updatedAt
      collections.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    
    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get single collection
router.get('/:id', async (req, res) => {
  try {
    let collection;
    let eventDetails = [];

    if (useDatabase) {
      collection = await Collection.findOne({ 
        $or: [{ id: req.params.id }, { slug: req.params.id }] 
      });
      
      if (collection && collection.events.length > 0) {
        const eventIds = collection.events.map(e => e.eventId);
        eventDetails = await Event.find({ id: { $in: eventIds } });
      }
    } else {
      // Use JSON files
      const collections = readJSONFile('collections.json');
      collection = collections.find(c => c.id === req.params.id || c.slug === req.params.id);
      
      if (collection && collection.events.length > 0) {
        const events = readJSONFile('events.json');
        const eventIds = collection.events.map(e => e.eventId);
        eventDetails = events.filter(e => eventIds.includes(e.id));
      }
    }
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json({ ...collection, eventDetails });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Create new collection
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      imageUrl,
      organizer,
      organizerId,
      visibility = 'public',
      tags = [],
      settings = {}
    } = req.body;
    
    if (!name || !organizer || !organizerId) {
      return res.status(400).json({ 
        error: 'Name, organizer, and organizerId are required' 
      });
    }
    
    const collectionId = 'collection_' + Math.random().toString(36).substr(2, 9);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substr(2, 7);
    
    const collectionData = {
      id: collectionId,
      name,
      description,
      imageUrl,
      organizer,
      organizerId,
      events: [],
      status: 'draft',
      visibility,
      slug,
      isActive: true,
      tags,
      settings: {
        allowEventSubmissions: settings.allowEventSubmissions || false,
        requireApproval: settings.requireApproval || true,
        displayMode: settings.displayMode || 'grid'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let collection;
    
    if (useDatabase) {
      collection = new Collection(collectionData);
      await collection.save();
    } else {
      // Use JSON file
      const collections = readJSONFile('collections.json');
      collections.push(collectionData);
      writeJSONFile('collections.json', collections);
      collection = collectionData;
    }
    
    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// Update collection
router.put('/:id', async (req, res) => {
  try {
    const collection = await Collection.findOne({ 
      $or: [{ id: req.params.id }, { slug: req.params.id }] 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const allowedUpdates = [
      'name', 'description', 'imageUrl', 'visibility', 
      'tags', 'settings', 'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        collection[field] = req.body[field];
      }
    });
    
    await collection.save();
    res.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// Add event to collection
router.post('/:id/events', async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    const collection = await Collection.findOne({ 
      $or: [{ id: req.params.id }, { slug: req.params.id }] 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    // Check if event exists
    const event = await Event.findOne({ id: eventId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if event already in collection
    const existingEvent = collection.events.find(e => e.eventId === eventId);
    if (existingEvent) {
      return res.status(400).json({ error: 'Event already in collection' });
    }
    
    collection.events.push({ eventId });
    await collection.save();
    
    res.json({ message: 'Event added to collection', collection });
  } catch (error) {
    console.error('Error adding event to collection:', error);
    res.status(500).json({ error: 'Failed to add event to collection' });
  }
});

// Remove event from collection
router.delete('/:id/events/:eventId', async (req, res) => {
  try {
    const collection = await Collection.findOne({ 
      $or: [{ id: req.params.id }, { slug: req.params.id }] 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    collection.events = collection.events.filter(e => e.eventId !== req.params.eventId);
    await collection.save();
    
    res.json({ message: 'Event removed from collection', collection });
  } catch (error) {
    console.error('Error removing event from collection:', error);
    res.status(500).json({ error: 'Failed to remove event from collection' });
  }
});

// Get events available to add to collection (organizer's events not in collection)
router.get('/:id/available-events', async (req, res) => {
  try {
    const collection = await Collection.findOne({ 
      $or: [{ id: req.params.id }, { slug: req.params.id }] 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const eventIdsInCollection = collection.events.map(e => e.eventId);
    
    // Find organizer's events not in this collection
    const availableEvents = await Event.find({
      organizerId: collection.organizerId,
      id: { $nin: eventIdsInCollection },
      isActive: true
    }).sort({ startDate: 1 });
    
    res.json(availableEvents);
  } catch (error) {
    console.error('Error fetching available events:', error);
    res.status(500).json({ error: 'Failed to fetch available events' });
  }
});

// Delete collection
router.delete('/:id', async (req, res) => {
  try {
    const collection = await Collection.findOneAndDelete({ 
      $or: [{ id: req.params.id }, { slug: req.params.id }] 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

module.exports = router;