const mongoose = require('mongoose');

const socialLinksSchema = new mongoose.Schema({
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  tiktok: { type: String, default: '' }
}, { _id: false });

const profileSchema = new mongoose.Schema({
  avatar: { type: String, default: null },
  bio: { type: String, default: '' },
  website: { type: String, default: '' },
  socialLinks: { type: socialLinksSchema, default: () => ({}) }
}, { _id: false });

const socialMediaStatsSchema = new mongoose.Schema({
  facebook: {
    followers: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  instagram: {
    followers: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  linkedin: {
    followers: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  tiktok: {
    followers: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  }
}, { _id: false });

const teamRolePermissionsSchema = new mongoose.Schema({
  canCreateEvents: { type: Boolean, default: false },
  canEditEvents: { type: Boolean, default: false },
  canManageTeam: { type: Boolean, default: false },
  canViewAnalytics: { type: Boolean, default: false },
  canManageSettings: { type: Boolean, default: false },
  canDeleteOrganization: { type: Boolean, default: false }
}, { _id: false });

const teamRoleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#000000' },
  isSystem: { type: Boolean, default: false },
  permissions: { type: teamRolePermissionsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
  isOrganizer: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  profile: { type: profileSchema, default: () => ({}) },
  likedEvents: [{ type: String }],
  marketingCampaigns: [{ type: mongoose.Schema.Types.Mixed }],
  socialMediaPosts: [{ type: mongoose.Schema.Types.Mixed }],
  adCampaigns: [{ type: mongoose.Schema.Types.Mixed }],
  socialMediaStats: { type: socialMediaStatsSchema, default: () => ({}) },
  teamMembers: [{ type: mongoose.Schema.Types.Mixed }],
  teamRoles: [teamRoleSchema],
  teamInvitations: [{ type: mongoose.Schema.Types.Mixed }],
  organizationId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'users'
});

userSchema.index({ email: 1 });
userSchema.index({ id: 1 });

module.exports = mongoose.model('User', userSchema);