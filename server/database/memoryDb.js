class MemoryDatabase {
  constructor() {
    // In-memory storage for serverless environments
    this.users = [];
    this.events = [];
    this.bankAccounts = [];
    this.payouts = [];
    this.financialData = {};
    this.apps = this.getSampleApps();
    this.userApps = [];
    this.initialized = false;
    this.init();
  }

  async init() {
    if (this.initialized) return;
    
    // Initialize with sample data
    this.events = this.getSampleEvents();
    this.apps = this.getSampleApps();
    this.initialized = true;
    console.log('Memory database initialized for serverless environment');
  }

  // Helper methods
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Users
  async getUsers() {
    return this.users;
  }

  async findUserByEmail(email) {
    return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async findUserById(id) {
    return this.users.find(user => user.id === id);
  }

  async createUser(userData) {
    try {
      const existingUser = this.users.find(user => user.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      const newUser = {
        id: this.generateId(),
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        role: userData.role || 'user',
        isOrganizer: userData.isOrganizer || false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
          bio: '',
          website: '',
          location: '',
          socialMedia: {
            facebook: '',
            instagram: '',
            linkedin: '',
            tiktok: ''
          }
        }
      };

      this.users.push(newUser);
      const { password, ...userWithoutPassword } = newUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updateUser(id, updates) {
    try {
      const userIndex = this.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      this.users[userIndex] = {
        ...this.users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const { password, ...userWithoutPassword } = this.users[userIndex];
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  // Events
  async getAllEvents() {
    return this.events;
  }

  async getEventById(id) {
    return this.events.find(event => event.id === id);
  }

  async createEvent(eventData) {
    try {
      const newEvent = {
        id: this.generateId(),
        ...eventData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      };

      this.events.push(newEvent);
      return { success: true, event: newEvent };
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, error: 'Failed to create event' };
    }
  }

  // Apps
  async getAllApps() {
    return this.apps;
  }

  async getAppById(id) {
    return this.apps.find(app => app.id === id);
  }

  async getAppCategories() {
    const categories = [...new Set(this.apps.map(app => app.category))];
    return categories;
  }

  async getUserInstalledApps(userId) {
    return this.userApps.filter(ua => ua.userId === userId);
  }

  async isAppInstalled(userId, appId) {
    return this.userApps.some(ua => ua.userId === userId && ua.appId === appId);
  }

  async installApp(userId, appId) {
    try {
      if (this.isAppInstalled(userId, appId)) {
        return { success: false, error: 'App already installed' };
      }

      const installation = {
        id: this.generateId(),
        userId,
        appId,
        installedAt: new Date().toISOString()
      };

      this.userApps.push(installation);
      return { success: true, installation };
    } catch (error) {
      return { success: false, error: 'Failed to install app' };
    }
  }

  async uninstallApp(userId, appId) {
    try {
      const index = this.userApps.findIndex(ua => ua.userId === userId && ua.appId === appId);
      if (index === -1) {
        return { success: false, error: 'App not installed' };
      }

      this.userApps.splice(index, 1);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to uninstall app' };
    }
  }

  // Placeholder methods for other functionality
  async getUserOrders(userId) { return []; }
  async getUserLikes(userId) { return []; }
  async getUserFollowing(userId) { return []; }
  async getUserTickets(userId) { return []; }
  async getBankAccounts(userId) { return []; }
  async getFinancialSummary(userId) { return { availableBalance: 0, pendingPayouts: 0, totalEarnings: 0 }; }

  // Sample data
  getSampleEvents() {
    return [
      {
        id: 'sample-1',
        title: 'Tech Conference 2025',
        description: 'Annual technology conference featuring the latest innovations',
        location: 'San Francisco, CA',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
        price: 299,
        currency: 'USD',
        maxAttendees: 500,
        organizerId: 'sample-org-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  getSampleApps() {
    return [
      {
        id: 'app-1',
        name: 'Event Analytics Pro',
        description: 'Advanced analytics and reporting for your events',
        category: 'Analytics',
        price: 29.99,
        rating: 4.5,
        downloads: 1250,
        createdAt: new Date().toISOString()
      },
      {
        id: 'app-2', 
        name: 'Social Media Booster',
        description: 'Boost your event promotion on social media',
        category: 'Marketing',
        price: 19.99,
        rating: 4.2,
        downloads: 890,
        createdAt: new Date().toISOString()
      }
    ];
  }
}

module.exports = new MemoryDatabase();