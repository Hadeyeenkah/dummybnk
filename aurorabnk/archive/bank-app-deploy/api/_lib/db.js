const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      bufferCommands: false,
    });
    cachedConnection = conn;
    console.log('✅ Database connected');
    return conn;
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
}

module.exports = { connectDB };
