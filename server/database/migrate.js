const { connectDB } = require('./mongodb');
const { User, Event, App } = require('./models');
const fs = require('fs-extra');
const path = require('path');

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await App.deleteMany({});
    
    console.log('Cleared existing MongoDB data');

    // Migrate Users
    const usersData = await fs.readJson(path.join(__dirname, 'data', 'users.json'));
    if (usersData.length > 0) {
      await User.insertMany(usersData);
      console.log(`Migrated ${usersData.length} users`);
    }

    // Migrate Events
    const eventsData = await fs.readJson(path.join(__dirname, 'data', 'events.json'));
    if (eventsData.length > 0) {
      await Event.insertMany(eventsData);
      console.log(`Migrated ${eventsData.length} events`);
    }

    // Migrate Apps
    const appsData = await fs.readJson(path.join(__dirname, 'data', 'apps.json'));
    if (appsData.length > 0) {
      await App.insertMany(appsData);
      console.log(`Migrated ${appsData.length} apps`);
    }

    console.log('Data migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };