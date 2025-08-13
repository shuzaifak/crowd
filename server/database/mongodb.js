const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.warn('MONGODB_URI environment variable is not set, falling back to JSON storage');
      return false;
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return true;
    }
    
    console.log('🔄 Attempting MongoDB connection...');
    console.log('MongoDB URI format:', mongoURI.substring(0, 50) + '...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 3, // Reduced pool size for serverless
      maxIdleTimeMS: 30000,
      bufferCommands: false,
      bufferMaxEntries: 0,
      retryWrites: true,
      writeConcern: { w: 'majority' }
    });
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error details:', {
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      name: error.name
    });
    // DON'T exit process in serverless environment - just return false
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

module.exports = { connectDB, mongoose };