const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'PKR' },
  maxAttendees: { type: Number, required: true, min: 1 },
  currentAttendees: { type: Number, default: 0, min: 0 },
  organizer: { type: String, required: true },
  organizerId: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'], 
    default: 'draft' 
  },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  imageUrl: { type: String },
  tags: [{ type: String }],
  attendees: [{ type: String }],
  ticketTypes: [{
    id: String,
    name: String,
    price: Number,
    quantity: Number,
    sold: { type: Number, default: 0 },
    description: String
  }],
  // Additional event details for preview
  startTime: { type: String }, // Format: "HH:MM"
  endTime: { type: String },   // Format: "HH:MM"
  timezone: { type: String, default: 'UTC' },
  overviewDescription: { type: String },
  whyAttend: { type: String },
  howToParticipate: { type: String },
  closingMessage: { type: String },
  publishedAt: { type: Date },
  // Organizer profile info
  organizerProfile: {
    bio: { type: String },
    avatar: { type: String },
    socialLinks: {
      website: { type: String },
      twitter: { type: String },
      facebook: { type: String },
      instagram: { type: String },
      linkedin: { type: String }
    }
  }
}, {
  timestamps: true,
  collection: 'events'
});

eventSchema.index({ id: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Event', eventSchema);