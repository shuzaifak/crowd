const { User, Event, App } = require('./models');

class MongoDatabase {
  constructor() {
    this.init();
  }

  async init() {
    console.log('MongoDB Database initialized');
  }

  generateId(prefix = 'user') {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}${Date.now()}`;
  }

  // User methods
  async getUsers() {
    try {
      return await User.find({}).lean();
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  }

  async findUserByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase() }).lean();
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async findUserById(id) {
    try {
      return await User.findOne({ id }).lean();
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async createUser(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      const newUser = new User({
        id: this.generateId('user'),
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        role: userData.role || 'user',
        isOrganizer: userData.isOrganizer || false,
        isActive: true,
        likedEvents: [],
        marketingCampaigns: [],
        socialMediaPosts: [],
        adCampaigns: [],
        socialMediaStats: {
          facebook: { followers: 0, posts: 0, engagement: 0 },
          instagram: { followers: 0, posts: 0, engagement: 0 },
          linkedin: { followers: 0, posts: 0, engagement: 0 },
          tiktok: { followers: 0, posts: 0, engagement: 0 }
        },
        profile: {
          avatar: null,
          bio: '',
          website: '',
          socialLinks: {}
        },
        teamMembers: [],
        teamRoles: [],
        teamInvitations: [],
        organizationId: null
      });

      const savedUser = await newUser.save();
      const { password, ...userWithoutPassword } = savedUser.toObject();
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updateUser(id, updates) {
    try {
      const updatedUser = await User.findOneAndUpdate(
        { id },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedUser) {
        return { success: false, error: 'User not found' };
      }

      const { password, ...userWithoutPassword } = updatedUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  async getUserById(id) {
    return await this.findUserById(id);
  }

  // Event methods
  async getAllEvents() {
    try {
      return await Event.find({}).lean();
    } catch (error) {
      console.error('Error reading events:', error);
      return [];
    }
  }

  async getEventById(id) {
    try {
      return await Event.findOne({ id }).lean();
    } catch (error) {
      console.error('Error finding event by id:', error);
      return null;
    }
  }

  async updateEvent(id, updates) {
    try {
      const updatedEvent = await Event.findOneAndUpdate(
        { id },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedEvent) {
        return { success: false, error: 'Event not found' };
      }

      return { success: true, event: updatedEvent };
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: 'Failed to update event' };
    }
  }

  async getPublicEvents(options = {}) {
    try {
      let query = {
        status: 'published',
        isActive: true,
        startDate: { $gt: new Date() }
      };

      if (options.category) {
        query.category = new RegExp(options.category, 'i');
      }

      if (options.location) {
        query.location = new RegExp(options.location, 'i');
      }

      if (options.search) {
        const searchRegex = new RegExp(options.search, 'i');
        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ];
      }

      let eventsQuery = Event.find(query).sort({ startDate: 1 });

      if (options.offset) {
        eventsQuery = eventsQuery.skip(options.offset);
      }

      if (options.limit) {
        eventsQuery = eventsQuery.limit(options.limit);
      } else {
        eventsQuery = eventsQuery.limit(10);
      }

      return await eventsQuery.lean();
    } catch (error) {
      console.error('Error getting public events:', error);
      return [];
    }
  }

  async getPublicStats() {
    try {
      const events = await Event.find({ status: 'published', isActive: true }).lean();
      const categories = [...new Set(events.map(event => event.category).filter(Boolean))];
      const locations = [...new Set(events.map(event => event.location).filter(Boolean))];
      const upcomingEvents = events.filter(event => new Date(event.startDate) > new Date()).length;

      return {
        totalEvents: events.length,
        totalCategories: categories.length,
        upcomingEvents,
        categories: categories.map(cat => ({ 
          name: cat, 
          count: events.filter(e => e.category === cat).length 
        })),
        locations: locations.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting public stats:', error);
      return { totalEvents: 0, totalCategories: 0, upcomingEvents: 0, categories: [], locations: [] };
    }
  }

  async getPersonalizedEvents(options = {}) {
    try {
      return await this.getPublicEvents(options);
    } catch (error) {
      console.error('Error getting personalized events:', error);
      return [];
    }
  }

  async getUserStats(userId) {
    try {
      return {
        eventsAttended: 5,
        eventsCreated: 2,
        ticketsPurchased: 8,
        savedEvents: 12,
        favoriteCategories: ['Technology', 'Music'],
        suggestedCategories: ['Art', 'Food'],
        nearbyEvents: 15,
        friendsActivity: [],
        totalAvailableEvents: await Event.countDocuments()
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {};
    }
  }

  async getRecommendedEvents(userId, limit = 5) {
    try {
      return await this.getPublicEvents({ limit });
    } catch (error) {
      console.error('Error getting recommended events:', error);
      return [];
    }
  }

  async getUserRecentActivity(userId, limit = 10) {
    try {
      return [
        { type: 'ticket_purchased', eventTitle: 'Tech Conference 2025', date: new Date().toISOString() },
        { type: 'event_saved', eventTitle: 'Music Festival', date: new Date().toISOString() }
      ].slice(0, limit);
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  async getTrendingEvents(limit = 6) {
    try {
      return await this.getPublicEvents({ limit: limit * 2 }).then(events => events.slice(0, limit));
    } catch (error) {
      console.error('Error getting trending events:', error);
      return [];
    }
  }

  async getFeaturedEvents(limit = 8) {
    try {
      return await Event.find({
        isFeatured: true,
        status: 'published',
        isActive: true,
        startDate: { $gt: new Date() }
      }).limit(limit).lean();
    } catch (error) {
      console.error('Error getting featured events:', error);
      return [];
    }
  }

  // App methods
  async getAllApps() {
    try {
      return await App.find({}).lean();
    } catch (error) {
      console.error('Error reading apps:', error);
      return [];
    }
  }

  async getAppById(id) {
    try {
      return await App.findOne({ id }).lean();
    } catch (error) {
      console.error('Error finding app by id:', error);
      return null;
    }
  }

  async getAppCategories() {
    try {
      const apps = await App.find({}).lean();
      const categories = [...new Set(apps.map(app => app.category))];
      return categories.map(category => ({
        id: category,
        name: category,
        count: apps.filter(app => app.category === category).length
      }));
    } catch (error) {
      console.error('Error getting app categories:', error);
      return [];
    }
  }

  // Mock methods for tickets, orders, likes, following, etc.
  async getUserTickets(userId) {
    return [
      {
        id: 'ticket_1',
        userId: userId,
        eventId: 'event_1',
        eventTitle: 'Tech Innovation Summit 2025',
        eventDate: '2025-09-15T09:00:00Z',
        eventLocation: 'Lahore Convention Center, Punjab',
        type: 'General Admission',
        quantity: 2,
        price: 2500,
        status: 'confirmed',
        purchaseDate: '2025-01-05T10:00:00Z'
      }
    ];
  }

  async getUserOrders(userId) {
    return [
      {
        id: 'order_1',
        userId: userId,
        total: 5000,
        status: 'completed',
        createdAt: '2025-01-05T10:00:00Z',
        items: [{
          eventId: 'event_1',
          eventTitle: 'Tech Innovation Summit 2025',
          ticketType: 'General Admission',
          quantity: 2,
          price: 2500
        }]
      }
    ];
  }

  async getUserLikes(userId) {
    return [
      { eventId: 'event_1', likedAt: '2025-01-01T12:00:00Z' }
    ];
  }

  async getUserFollowing(userId) {
    return [
      { organizerId: 'org_1', followedAt: '2025-01-01T10:00:00Z' }
    ];
  }

  // Financial mock methods
  async getFinancialSummary(userId) {
    return {
      availableBalance: 1000,
      pendingBalance: 500,
      totalPaidOut: 2000,
      totalEarnings: 3500,
      nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      payoutSchedule: 'weekly',
      minimumPayout: 25
    };
  }

  async getPayoutHistory(userId, page = 1, limit = 20) {
    return { payouts: [], total: 0, page: 1, totalPages: 0 };
  }

  async initiatePayout(userId, bankAccountId, amount) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  // Bank account mock methods
  async getUserBankAccounts(userId) {
    return [];
  }

  async createBankAccount(bankAccountData) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  async updateBankAccount(id, updates) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  async deleteBankAccount(id) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  async setPrimaryBankAccount(userId, bankAccountId) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  // User apps mock methods
  async getUserInstalledApps(userId) {
    return [];
  }

  async isAppInstalled(userId, appId) {
    return false;
  }

  async installApp(userId, appId) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  async uninstallApp(userId, appId) {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }

  async rateApp(userId, appId, rating, review = '') {
    return { success: false, error: 'Not implemented for MongoDB yet' };
  }
}

module.exports = new MongoDatabase();