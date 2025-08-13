const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  organizer: { type: String, required: true },
  organizerId: { type: String, required: true },
  events: [{ 
    eventId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  slug: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  tags: [{ type: String }],
  settings: {
    allowEventSubmissions: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    displayMode: { 
      type: String, 
      enum: ['grid', 'list', 'calendar'], 
      default: 'grid' 
    }
  }
}, {
  timestamps: true,
  collection: 'collections'
});

collectionSchema.index({ id: 1 });
collectionSchema.index({ slug: 1 });
collectionSchema.index({ organizerId: 1 });
collectionSchema.index({ status: 1 });
collectionSchema.index({ visibility: 1 });
collectionSchema.index({ isActive: 1 });
collectionSchema.index({ 'events.eventId': 1 });

// Pre-save hook to generate slug
collectionSchema.pre('save', function(next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substr(2, 7);
  }
  next();
});

module.exports = mongoose.model('Collection', collectionSchema);