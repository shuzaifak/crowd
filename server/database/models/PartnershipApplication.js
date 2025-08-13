const mongoose = require('mongoose');

const PartnershipApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicationType: {
        type: String,
        enum: ['influencer', 'venue'],
        required: true
    },
    // Common fields
    contactInfo: {
        email: { type: String, required: true },
        phone: { type: String, required: true },
        fullName: { type: String, required: true }
    },
    businessInfo: {
        businessName: { type: String, required: true },
        businessType: { type: String },
        website: { type: String },
        socialMedia: {
            instagram: { type: String },
            twitter: { type: String },
            tiktok: { type: String },
            youtube: { type: String },
            facebook: { type: String }
        }
    },
    // Influencer specific fields
    influencerDetails: {
        niche: { type: String }, // e.g., music, lifestyle, tech
        followerCount: {
            instagram: { type: Number },
            twitter: { type: Number },
            tiktok: { type: Number },
            youtube: { type: Number },
            facebook: { type: Number }
        },
        avgEngagementRate: { type: Number },
        previousBrandPartnerships: { type: String }, // Description
        contentTypes: [{ type: String }], // posts, stories, reels, videos
        rateCard: {
            post: { type: Number },
            story: { type: Number },
            reel: { type: Number },
            video: { type: Number }
        }
    },
    // Venue specific fields
    venueDetails: {
        venueType: { type: String }, // restaurant, club, bar, event_space
        capacity: { type: Number },
        location: {
            address: { type: String },
            city: { type: String },
            state: { type: String },
            zipCode: { type: String },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number }
            }
        },
        amenities: [{ type: String }],
        eventTypes: [{ type: String }], // concerts, parties, corporate_events
        pricing: {
            hourlyRate: { type: Number },
            dailyRate: { type: Number },
            weeklyRate: { type: Number }
        },
        availability: {
            daysAvailable: [{ type: String }], // monday, tuesday, etc.
            timeSlots: [{ 
                start: { type: String }, 
                end: { type: String } 
            }]
        },
        photos: [{ type: String }], // URLs to venue photos
        licenses: {
            liquorLicense: { type: Boolean, default: false },
            musicLicense: { type: Boolean, default: false },
            eventPermit: { type: Boolean, default: false }
        }
    },
    // Application status and metadata
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected', 'needs_info'],
        default: 'pending'
    },
    rejectionReason: { type: String },
    notes: { type: String },
    reviewerNotes: { type: String },
    documents: [{
        name: { type: String },
        url: { type: String },
        type: { type: String } // contract, license, portfolio
    }],
    partnershipTerms: {
        commissionRate: { type: Number }, // percentage
        minimumRevenue: { type: Number },
        contractDuration: { type: Number }, // months
        exclusivity: { type: Boolean, default: false }
    },
    submissionDate: {
        type: Date,
        default: Date.now
    },
    reviewDate: { type: Date },
    approvalDate: { type: Date },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better performance
PartnershipApplicationSchema.index({ userId: 1 });
PartnershipApplicationSchema.index({ applicationType: 1 });
PartnershipApplicationSchema.index({ status: 1 });
PartnershipApplicationSchema.index({ submissionDate: -1 });

// Virtual for application age
PartnershipApplicationSchema.virtual('applicationAge').get(function() {
    return Math.floor((Date.now() - this.submissionDate) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
PartnershipApplicationSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

// Instance methods
PartnershipApplicationSchema.methods.updateStatus = function(newStatus, notes = '') {
    this.status = newStatus;
    this.reviewerNotes = notes;
    this.reviewDate = Date.now();
    
    if (newStatus === 'approved') {
        this.approvalDate = Date.now();
    }
    
    return this.save();
};

PartnershipApplicationSchema.methods.addDocument = function(name, url, type) {
    this.documents.push({ name, url, type });
    return this.save();
};

// Static methods
PartnershipApplicationSchema.statics.getByStatus = function(status) {
    return this.find({ status }).populate('userId', 'email username');
};

PartnershipApplicationSchema.statics.getByType = function(applicationType) {
    return this.find({ applicationType }).populate('userId', 'email username');
};

PartnershipApplicationSchema.statics.getPendingApplications = function() {
    return this.find({ status: 'pending' })
        .sort({ submissionDate: 1 })
        .populate('userId', 'email username');
};

module.exports = mongoose.model('PartnershipApplication', PartnershipApplicationSchema);