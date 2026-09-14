const mongoose = require('mongoose');

let isConnected = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempt to connect to MongoDB with retries.
 * Resolves when connected.
 * Throws an error if all retries are exhausted (caller MUST handle this).
 */
exports.connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securebank';
  // In production (serverless) avoid long blocking retries which can cause function timeouts
  const defaultRetries = process.env.NODE_ENV === 'production' ? 2 : 5;
  const maxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES || defaultRetries);
  const defaultRetryDelay = process.env.NODE_ENV === 'production' ? 500 : 2000;
  const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_MS || defaultRetryDelay);
  const defaultServerSelectionTimeout = process.env.NODE_ENV === 'production' ? 8000 : 5000;
  const serverSelectionTimeoutMS = Number(
    process.env.DB_SERVER_SELECTION_TIMEOUT_MS || defaultServerSelectionTimeout
  );

  // Helper: mask credentials for logging and extract host/db
  const maskUriForLog = (raw) => {
    try {
      // Basic masking for mongodb URIs
      return raw
        .replace(/:\/\/[\w.-]+:[^@]+@/i, '://****:****@')
        .replace(/\?[^#]+$/, ''); // drop query params
    } catch (_) {
      return 'mongodb://****:****@<host>/<db>';
    }
  };

  console.log('🗄️  MongoDB URI (sanitized):', maskUriForLog(uri));

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {
        autoIndex: true,
        serverSelectionTimeoutMS,
        socketTimeoutMS: 45000,
        // keep server selection timeout short in serverless environments
      });
      isConnected = true;
      console.log(`✅ MongoDB connected (attempt ${attempt}/${maxRetries})`);

      // Seed demo users if enabled
      if (process.env.DEMO_SEED === 'true') {
        try {
          const { seedDemoUsers } = require('../utils/seedDemoUsers');
          await seedDemoUsers();
        } catch (err) {
          console.error('❌ Failed to seed demo users:', err.message);
        }
      }

      return true;
    } catch (err) {
      lastError = err;
      const canRetry = attempt < maxRetries;
      console.error(`⚠️  MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
      if (canRetry) {
        console.log(`⏳ Retrying in ${retryDelayMs}ms...`);
        await sleep(retryDelayMs);
      }
    }
  }

  // IMPORTANT: throw instead of silently returning false.
  // Returning false let callers proceed to query the DB anyway,
  // which caused Mongoose to buffer operations and time out after 10s
  // with a confusing "buffering timed out" error instead of a clear one.
  isConnected = false;
  console.error('🚫 Unable to connect to MongoDB after retries.');
  throw new Error(
    `Unable to connect to MongoDB after ${maxRetries} attempt(s): ${lastError ? lastError.message : 'unknown error'}`
  );
};

exports.isDBConnected = () => isConnected && mongoose.connection.readyState === 1;