const fs = require('fs-extra');
const path = require('path');

class Database {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.eventsFile = path.join(this.dataDir, 'events.json');
    this.bankAccountsFile = path.join(this.dataDir, 'bankAccounts.json');
    this.payoutsFile = path.join(this.dataDir, 'payouts.json');
    this.financialDataFile = path.join(this.dataDir, 'financialData.json');
    this.appsFile = path.join(this.dataDir, 'apps.json');
    this.userAppsFile = path.join(this.dataDir, 'userApps.json');
    this.init();
  }

  async init() {
    try {
      await fs.ensureDir(this.dataDir);
      
      if (!(await fs.pathExists(this.usersFile))) {
        await this.saveUsers([]);
      }
      
      if (!(await fs.pathExists(this.eventsFile))) {
        await this.saveEvents(this.getSampleEvents());
      }
      
      if (!(await fs.pathExists(this.bankAccountsFile))) {
        await this.saveBankAccounts([]);
      }
      
      if (!(await fs.pathExists(this.payoutsFile))) {
        await this.savePayouts([]);
      }
      
      if (!(await fs.pathExists(this.financialDataFile))) {
        await this.saveFinancialData({});
      }
      
      if (!(await fs.pathExists(this.appsFile))) {
        await this.saveApps([]);
      }
      
      if (!(await fs.pathExists(this.userAppsFile))) {
        await this.saveUserApps([]);
      }
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async getUsers() {
    try {
      const users = await fs.readJson(this.usersFile);
      return users || [];
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      await fs.writeJson(this.usersFile, users, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  }

  async findUserByEmail(email) {
    const users = await this.getUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async findUserById(id) {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async createUser(userData) {
    try {
      const users = await this.getUsers();
      
      const existingUser = users.find(user => user.email.toLowerCase() === userData.email.toLowerCase());
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
        likedEvents: [], // Initialize empty liked events array
        marketingCampaigns: [], // Initialize empty marketing campaigns array
        socialMediaPosts: [], // Initialize empty social media posts array
        adCampaigns: [], // Initialize empty ad campaigns array with targeting data
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
        // Team Management fields
        teamMembers: [], // Array of team members for this user's organization
        teamRoles: [], // Array of custom roles created by this user
        teamInvitations: [], // Array of pending team invitations
        organizationId: null // In a real app, users would belong to organizations
      };

      users.push(newUser);
      const saved = await this.saveUsers(users);
      
      if (saved) {
        const { password, ...userWithoutPassword } = newUser;
        return { success: true, user: userWithoutPassword };
      } else {
        return { success: false, error: 'Failed to save user' };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updateUser(id, updates) {
    try {
      const users = await this.getUsers();
      const userIndex = users.findIndex(user => user.id === id);
      
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      users[userIndex] = {
        ...users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const saved = await this.saveUsers(users);
      
      if (saved) {
        const { password, ...userWithoutPassword } = users[userIndex];
        return { success: true, user: userWithoutPassword };
      } else {
        return { success: false, error: 'Failed to update user' };
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  async getUserById(id) {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async getAllEvents() {
    return await this.getEvents();
  }

  async getEventById(id) {
    const events = await this.getEvents();
    return events.find(event => event.id === id);
  }

  async updateEvent(id, updates) {
    try {
      const events = await this.getEvents();
      const eventIndex = events.findIndex(event => event.id === id);
      
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      events[eventIndex] = {
        ...events[eventIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const saved = await this.saveEvents(events);
      
      if (saved) {
        return { success: true, event: events[eventIndex] };
      } else {
        return { success: false, error: 'Failed to update event' };
      }
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: 'Failed to update event' };
    }
  }

  generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }

  // Events methods
  async getEvents() {
    try {
      const events = await fs.readJson(this.eventsFile);
      return events || [];
    } catch (error) {
      console.error('Error reading events:', error);
      return [];
    }
  }

  async saveEvents(events) {
    try {
      await fs.writeJson(this.eventsFile, events, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving events:', error);
      return false;
    }
  }

  // Public events (no authentication required)
  async getPublicEvents(options = {}) {
    try {
      const events = await this.getEvents();
      let filteredEvents = events.filter(event => 
        event.status === 'published' && 
        event.isActive && 
        new Date(event.startDate) > new Date()
      );

      // Apply filters
      if (options.category) {
        filteredEvents = filteredEvents.filter(event => 
          event.category?.toLowerCase().includes(options.category.toLowerCase())
        );
      }

      if (options.location) {
        filteredEvents = filteredEvents.filter(event => 
          event.location?.toLowerCase().includes(options.location.toLowerCase())
        );
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredEvents = filteredEvents.filter(event =>
          event.title?.toLowerCase().includes(searchTerm) ||
          event.description?.toLowerCase().includes(searchTerm) ||
          event.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by date
      filteredEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      // Apply pagination
      const startIndex = options.offset || 0;
      const endIndex = startIndex + (options.limit || 10);
      
      return filteredEvents.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Error getting public events:', error);
      return [];
    }
  }

  async getPublicStats() {
    try {
      const events = await this.getEvents();
      const activeEvents = events.filter(event => 
        event.status === 'published' && 
        event.isActive
      );

      const categories = [...new Set(activeEvents.map(event => event.category).filter(Boolean))];
      const locations = [...new Set(activeEvents.map(event => event.location).filter(Boolean))];
      const upcomingEvents = activeEvents.filter(event => new Date(event.startDate) > new Date()).length;

      return {
        totalEvents: activeEvents.length,
        totalCategories: categories.length,
        upcomingEvents,
        categories: categories.map(cat => ({ name: cat, count: activeEvents.filter(e => e.category === cat).length })),
        locations: locations.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting public stats:', error);
      return { totalEvents: 0, totalCategories: 0, upcomingEvents: 0, categories: [], locations: [] };
    }
  }

  // Personalized events (requires authentication)
  async getPersonalizedEvents(options = {}) {
    try {
      const events = await this.getPublicEvents(options);
      // Add personalization logic here based on user preferences
      return events;
    } catch (error) {
      console.error('Error getting personalized events:', error);
      return [];
    }
  }

  async getUserStats(userId) {
    try {
      // Mock user stats - in real app, this would query user's activity
      return {
        eventsAttended: 5,
        eventsCreated: 2,
        ticketsPurchased: 8,
        savedEvents: 12,
        favoriteCategories: ['Technology', 'Music'],
        suggestedCategories: ['Art', 'Food'],
        nearbyEvents: 15,
        friendsActivity: [],
        totalAvailableEvents: (await this.getEvents()).length
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {};
    }
  }

  async getRecommendedEvents(userId, limit = 5) {
    try {
      const events = await this.getPublicEvents({ limit });
      return events.slice(0, limit);
    } catch (error) {
      console.error('Error getting recommended events:', error);
      return [];
    }
  }

  async getUserRecentActivity(userId, limit = 10) {
    try {
      // Mock recent activity
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
      const events = await this.getPublicEvents({ limit: limit * 2 });
      // Sort by some trending criteria (views, registrations, etc.)
      return events.slice(0, limit);
    } catch (error) {
      console.error('Error getting trending events:', error);
      return [];
    }
  }

  async getFeaturedEvents(limit = 8) {
    try {
      const events = await this.getEvents();
      const featuredEvents = events.filter(event => 
        event.isFeatured && 
        event.status === 'published' && 
        event.isActive &&
        new Date(event.startDate) > new Date()
      );
      return featuredEvents.slice(0, limit);
    } catch (error) {
      console.error('Error getting featured events:', error);
      return [];
    }
  }

  // User tickets and orders methods
  async getUserTickets(userId) {
    try {
      // Mock tickets data - in a real app, this would query a tickets table
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
        },
        {
          id: 'ticket_2',
          userId: userId,
          eventId: 'event_2',
          eventTitle: 'Lahore Food Festival',
          eventDate: '2025-08-20T16:00:00Z',
          eventLocation: 'Fortress Stadium, Lahore, Punjab',
          type: 'VIP Pass',
          quantity: 1,
          price: 1000,
          status: 'confirmed',
          purchaseDate: '2025-01-03T14:30:00Z'
        }
      ];
    } catch (error) {
      console.error('Error getting user tickets:', error);
      return [];
    }
  }

  async getUserOrders(userId) {
    try {
      // Mock orders data - in a real app, this would query an orders table
      return [
        {
          id: 'order_1',
          userId: userId,
          total: 5000,
          status: 'completed',
          createdAt: '2025-01-05T10:00:00Z',
          items: [
            {
              eventId: 'event_1',
              eventTitle: 'Tech Innovation Summit 2025',
              ticketType: 'General Admission',
              quantity: 2,
              price: 2500
            }
          ]
        },
        {
          id: 'order_2',
          userId: userId,
          total: 1000,
          status: 'completed',
          createdAt: '2025-01-03T14:30:00Z',
          items: [
            {
              eventId: 'event_2',
              eventTitle: 'Lahore Food Festival',
              ticketType: 'VIP Pass',
              quantity: 1,
              price: 1000
            }
          ]
        }
      ];
    } catch (error) {
      console.error('Error getting user orders:', error);
      return [];
    }
  }

  async getUserLikes(userId) {
    try {
      // Mock likes data - in a real app, this would query a likes table
      return [
        { eventId: 'event_1', likedAt: '2025-01-01T12:00:00Z' },
        { eventId: 'event_3', likedAt: '2025-01-02T15:30:00Z' }
      ];
    } catch (error) {
      console.error('Error getting user likes:', error);
      return [];
    }
  }

  async getUserFollowing(userId) {
    try {
      // Mock following data - in a real app, this would query a following table
      return [
        { organizerId: 'org_1', followedAt: '2025-01-01T10:00:00Z' },
        { organizerId: 'org_2', followedAt: '2025-01-02T11:00:00Z' }
      ];
    } catch (error) {
      console.error('Error getting user following:', error);
      return [];
    }
  }

  async getBankAccounts() {
    try {
      const bankAccounts = await fs.readJson(this.bankAccountsFile);
      return bankAccounts || [];
    } catch (error) {
      console.error('Error reading bank accounts:', error);
      return [];
    }
  }

  async saveBankAccounts(bankAccounts) {
    try {
      await fs.writeJson(this.bankAccountsFile, bankAccounts, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving bank accounts:', error);
      return false;
    }
  }

  async getUserBankAccounts(userId) {
    try {
      const bankAccounts = await this.getBankAccounts();
      return bankAccounts.filter(account => account.userId === userId && account.isActive);
    } catch (error) {
      console.error('Error getting user bank accounts:', error);
      return [];
    }
  }

  async getBankAccountById(id) {
    try {
      const bankAccounts = await this.getBankAccounts();
      return bankAccounts.find(account => account.id === id);
    } catch (error) {
      console.error('Error getting bank account by id:', error);
      return null;
    }
  }

  async createBankAccount(bankAccountData) {
    try {
      const bankAccounts = await this.getBankAccounts();
      
      if (bankAccountData.isPrimary) {
        const userAccounts = bankAccounts.filter(account => 
          account.userId === bankAccountData.userId && account.isActive
        );
        userAccounts.forEach(account => account.isPrimary = false);
      }
      
      bankAccounts.push(bankAccountData);
      const saved = await this.saveBankAccounts(bankAccounts);
      
      if (saved) {
        return { success: true, bankAccount: bankAccountData };
      } else {
        return { success: false, error: 'Failed to save bank account' };
      }
    } catch (error) {
      console.error('Error creating bank account:', error);
      return { success: false, error: 'Failed to create bank account' };
    }
  }

  async updateBankAccount(id, updates) {
    try {
      const bankAccounts = await this.getBankAccounts();
      const accountIndex = bankAccounts.findIndex(account => account.id === id);
      
      if (accountIndex === -1) {
        return { success: false, error: 'Bank account not found' };
      }

      if (updates.isPrimary) {
        const userAccounts = bankAccounts.filter(account => 
          account.userId === bankAccounts[accountIndex].userId && account.isActive && account.id !== id
        );
        userAccounts.forEach(account => account.isPrimary = false);
      }

      bankAccounts[accountIndex] = {
        ...bankAccounts[accountIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const saved = await this.saveBankAccounts(bankAccounts);
      
      if (saved) {
        return { success: true, bankAccount: bankAccounts[accountIndex] };
      } else {
        return { success: false, error: 'Failed to update bank account' };
      }
    } catch (error) {
      console.error('Error updating bank account:', error);
      return { success: false, error: 'Failed to update bank account' };
    }
  }

  async deleteBankAccount(id) {
    try {
      const bankAccounts = await this.getBankAccounts();
      const accountIndex = bankAccounts.findIndex(account => account.id === id);
      
      if (accountIndex === -1) {
        return { success: false, error: 'Bank account not found' };
      }

      bankAccounts[accountIndex].isActive = false;
      bankAccounts[accountIndex].deletedAt = new Date().toISOString();

      const saved = await this.saveBankAccounts(bankAccounts);
      
      if (saved) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to delete bank account' };
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return { success: false, error: 'Failed to delete bank account' };
    }
  }

  async setPrimaryBankAccount(userId, bankAccountId) {
    try {
      const bankAccounts = await this.getBankAccounts();
      const userAccounts = bankAccounts.filter(account => 
        account.userId === userId && account.isActive
      );
      
      const targetAccount = userAccounts.find(account => account.id === bankAccountId);
      if (!targetAccount) {
        return { success: false, error: 'Bank account not found' };
      }

      userAccounts.forEach(account => {
        account.isPrimary = account.id === bankAccountId;
      });

      const saved = await this.saveBankAccounts(bankAccounts);
      
      if (saved) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to set primary bank account' };
      }
    } catch (error) {
      console.error('Error setting primary bank account:', error);
      return { success: false, error: 'Failed to set primary bank account' };
    }
  }

  async getPayouts() {
    try {
      const payouts = await fs.readJson(this.payoutsFile);
      return payouts || [];
    } catch (error) {
      console.error('Error reading payouts:', error);
      return [];
    }
  }

  async savePayouts(payouts) {
    try {
      await fs.writeJson(this.payoutsFile, payouts, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving payouts:', error);
      return false;
    }
  }

  async getFinancialData() {
    try {
      const data = await fs.readJson(this.financialDataFile);
      return data || {};
    } catch (error) {
      console.error('Error reading financial data:', error);
      return {};
    }
  }

  async saveFinancialData(data) {
    try {
      await fs.writeJson(this.financialDataFile, data, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving financial data:', error);
      return false;
    }
  }

  async getFinancialSummary(userId) {
    try {
      const orders = await this.getUserOrders(userId);
      const payouts = await this.getPayoutHistory(userId, 1, 1000);
      
      const completedOrders = orders.filter(order => order.status === 'completed');
      const pendingOrders = orders.filter(order => order.status === 'pending');
      
      const totalEarnings = completedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalPaidOut = payouts.payouts.reduce((sum, payout) => 
        payout.status === 'completed' ? sum + payout.amount : sum, 0);
      const pendingBalance = pendingOrders.reduce((sum, order) => sum + order.total, 0);
      const availableBalance = totalEarnings - totalPaidOut;
      
      const nextPayout = new Date();
      nextPayout.setDate(nextPayout.getDate() + (7 - nextPayout.getDay()));
      
      return {
        availableBalance,
        pendingBalance,
        totalPaidOut,
        totalEarnings,
        nextPayoutDate: nextPayout.toISOString(),
        payoutSchedule: 'weekly',
        minimumPayout: 25
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return {
        availableBalance: 0,
        pendingBalance: 0,
        totalPaidOut: 0,
        totalEarnings: 0,
        nextPayoutDate: new Date().toISOString(),
        payoutSchedule: 'weekly',
        minimumPayout: 25
      };
    }
  }

  async getPayoutHistory(userId, page = 1, limit = 20) {
    try {
      const payouts = await this.getPayouts();
      const userPayouts = payouts.filter(payout => payout.userId === userId);
      
      userPayouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPayouts = userPayouts.slice(startIndex, endIndex);
      
      return {
        payouts: paginatedPayouts,
        total: userPayouts.length,
        page,
        totalPages: Math.ceil(userPayouts.length / limit)
      };
    } catch (error) {
      console.error('Error getting payout history:', error);
      return { payouts: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async initiatePayout(userId, bankAccountId, amount) {
    try {
      const summary = await this.getFinancialSummary(userId);
      
      if (amount > summary.availableBalance) {
        return { success: false, error: 'Insufficient balance' };
      }
      
      if (amount < summary.minimumPayout) {
        return { success: false, error: `Minimum payout amount is $${summary.minimumPayout}` };
      }
      
      const bankAccount = await this.getBankAccountById(bankAccountId);
      if (!bankAccount || bankAccount.userId !== userId || !bankAccount.isActive) {
        return { success: false, error: 'Invalid bank account' };
      }
      
      const payouts = await this.getPayouts();
      const newPayout = {
        id: 'payout_' + Math.random().toString(36).substr(2, 9) + Date.now(),
        userId,
        bankAccountId,
        amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        bankAccountInfo: {
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber ? '•••• ' + bankAccount.accountNumber.slice(-4) : '',
          country: bankAccount.country
        }
      };
      
      payouts.push(newPayout);
      const saved = await this.savePayouts(payouts);
      
      if (saved) {
        return { success: true, payout: newPayout };
      } else {
        return { success: false, error: 'Failed to initiate payout' };
      }
    } catch (error) {
      console.error('Error initiating payout:', error);
      return { success: false, error: 'Failed to initiate payout' };
    }
  }

  // App Marketplace methods
  async getApps() {
    try {
      const apps = await fs.readJson(this.appsFile);
      return apps || [];
    } catch (error) {
      console.error('Error reading apps:', error);
      return [];
    }
  }

  async saveApps(apps) {
    try {
      await fs.writeJson(this.appsFile, apps, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving apps:', error);
      return false;
    }
  }

  async getAllApps() {
    return await this.getApps();
  }

  async getAppById(id) {
    const apps = await this.getApps();
    return apps.find(app => app.id === id);
  }

  async getAppCategories() {
    const apps = await this.getApps();
    const categories = [...new Set(apps.map(app => app.category))];
    return categories.map(category => ({
      id: category,
      name: category,
      count: apps.filter(app => app.category === category).length
    }));
  }

  async getUserApps() {
    try {
      const userApps = await fs.readJson(this.userAppsFile);
      return userApps || [];
    } catch (error) {
      console.error('Error reading user apps:', error);
      return [];
    }
  }

  async saveUserApps(userApps) {
    try {
      await fs.writeJson(this.userAppsFile, userApps, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving user apps:', error);
      return false;
    }
  }

  async getUserInstalledApps(userId) {
    try {
      const userApps = await this.getUserApps();
      const userInstalledApps = userApps.filter(userApp => userApp.userId === userId);
      
      const apps = await this.getApps();
      const installedApps = userInstalledApps.map(userApp => {
        const app = apps.find(a => a.id === userApp.appId);
        return {
          ...app,
          installedAt: userApp.installedAt,
          isActive: userApp.isActive
        };
      }).filter(app => app && app.isActive);
      
      return installedApps;
    } catch (error) {
      console.error('Error getting user installed apps:', error);
      return [];
    }
  }

  async isAppInstalled(userId, appId) {
    try {
      const userApps = await this.getUserApps();
      return userApps.some(userApp => 
        userApp.userId === userId && 
        userApp.appId === appId && 
        userApp.isActive
      );
    } catch (error) {
      console.error('Error checking if app is installed:', error);
      return false;
    }
  }

  async installApp(userId, appId) {
    try {
      const userApps = await this.getUserApps();
      
      // Check if already installed
      const existingInstallation = userApps.find(userApp => 
        userApp.userId === userId && userApp.appId === appId
      );
      
      if (existingInstallation && existingInstallation.isActive) {
        return { success: false, error: 'App already installed' };
      }

      const installation = {
        id: 'installation_' + Math.random().toString(36).substr(2, 9) + Date.now(),
        userId,
        appId,
        installedAt: new Date().toISOString(),
        isActive: true
      };

      if (existingInstallation) {
        // Reactivate existing installation
        existingInstallation.isActive = true;
        existingInstallation.installedAt = new Date().toISOString();
      } else {
        // Create new installation
        userApps.push(installation);
      }

      const saved = await this.saveUserApps(userApps);
      
      if (saved) {
        return { success: true, installation };
      } else {
        return { success: false, error: 'Failed to install app' };
      }
    } catch (error) {
      console.error('Error installing app:', error);
      return { success: false, error: 'Failed to install app' };
    }
  }

  async uninstallApp(userId, appId) {
    try {
      const userApps = await this.getUserApps();
      const installationIndex = userApps.findIndex(userApp => 
        userApp.userId === userId && userApp.appId === appId && userApp.isActive
      );
      
      if (installationIndex === -1) {
        return { success: false, error: 'App not found or not installed' };
      }

      userApps[installationIndex].isActive = false;
      userApps[installationIndex].uninstalledAt = new Date().toISOString();

      const saved = await this.saveUserApps(userApps);
      
      if (saved) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to uninstall app' };
      }
    } catch (error) {
      console.error('Error uninstalling app:', error);
      return { success: false, error: 'Failed to uninstall app' };
    }
  }

  async rateApp(userId, appId, rating, review = '') {
    try {
      // In a real app, this would save to a ratings table
      // For now, we'll just return success
      const ratingData = {
        id: 'rating_' + Math.random().toString(36).substr(2, 9) + Date.now(),
        userId,
        appId,
        rating,
        review,
        createdAt: new Date().toISOString()
      };

      return { success: true, rating: ratingData };
    } catch (error) {
      console.error('Error rating app:', error);
      return { success: false, error: 'Failed to rate app' };
    }
  }

  getSampleEvents() {
    return [
      {
        id: 'event_1',
        title: 'Tech Innovation Summit 2025',
        description: 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations.',
        category: 'Technology',
        location: 'Lahore Convention Center, Punjab',
        startDate: '2025-09-15T09:00:00Z',
        endDate: '2025-09-15T17:00:00Z',
        price: 2500,
        currency: 'PKR',
        maxAttendees: 500,
        currentAttendees: 157,
        organizer: 'Tech Hub Pakistan',
        status: 'published',
        isActive: true,
        isFeatured: true,
        imageUrl: '/images/tech-summit.jpg',
        tags: ['technology', 'innovation', 'networking'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'event_2',
        title: 'Lahore Food Festival',
        description: 'Experience the best of Pakistani cuisine with over 100 food vendors and live cooking demonstrations.',
        category: 'Food & Drink',
        location: 'Fortress Stadium, Lahore, Punjab',
        startDate: '2025-08-20T16:00:00Z',
        endDate: '2025-08-22T22:00:00Z',
        price: 500,
        currency: 'PKR',
        maxAttendees: 2000,
        currentAttendees: 892,
        organizer: 'Lahore Events',
        status: 'published',
        isActive: true,
        isFeatured: true,
        imageUrl: '/images/food-festival.jpg',
        tags: ['food', 'culture', 'family'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'event_3',
        title: 'Digital Marketing Bootcamp',
        description: 'Learn the latest digital marketing strategies from industry experts in this intensive 2-day workshop.',
        category: 'Business',
        location: 'Online Event',
        startDate: '2025-08-25T10:00:00Z',
        endDate: '2025-08-26T16:00:00Z',
        price: 1500,
        currency: 'PKR',
        maxAttendees: 100,
        currentAttendees: 67,
        organizer: 'Digital Skills Institute',
        status: 'published',
        isActive: true,
        isFeatured: false,
        imageUrl: '/images/marketing-bootcamp.jpg',
        tags: ['marketing', 'business', 'online'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'event_4',
        title: 'Punjab Arts & Crafts Exhibition',
        description: 'Discover traditional and contemporary arts and crafts from talented local artists.',
        category: 'Arts & Culture',
        location: 'Punjab Arts Council, Lahore',
        startDate: '2025-09-01T11:00:00Z',
        endDate: '2025-09-05T18:00:00Z',
        price: 200,
        currency: 'PKR',
        maxAttendees: 300,
        currentAttendees: 89,
        organizer: 'Punjab Arts Council',
        status: 'published',
        isActive: true,
        isFeatured: false,
        imageUrl: '/images/arts-exhibition.jpg',
        tags: ['arts', 'culture', 'exhibition'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

module.exports = new Database();