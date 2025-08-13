const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: '🔧' },
  category: { 
    type: String, 
    enum: ['crm', 'marketing', 'tickets', 'analytics', 'payment', 'communication', 'productivity', 'reporting', 'email', 'website'],
    required: true 
  },
  developer: { type: String, required: true },
  version: { type: String, required: true },
  price: { type: String, enum: ['free', 'paid', 'freemium'], default: 'free' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0, min: 0 },
  featured: { type: Boolean, default: false },
  tags: [{ type: String }],
  permissions: [{ type: String }],
  installCount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true,
  collection: 'apps'
});

appSchema.index({ id: 1 });
appSchema.index({ category: 1 });
appSchema.index({ featured: 1 });
appSchema.index({ price: 1 });
appSchema.index({ rating: 1 });

module.exports = mongoose.model('App', appSchema);