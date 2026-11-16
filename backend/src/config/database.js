const mongoose = require('mongoose');
const config = require('./env');

let memoryServer = null;
let cachedPromise = null;

async function connectDB() {
  // If connection is already open, reuse it immediately (crucial for Vercel serverless)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection attempt is currently in-flight, return the existing promise
  if (cachedPromise) {
    return cachedPromise;
  }

  const options = {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 6000,
  };

  const isVercel = Boolean(process.env.VERCEL);

  cachedPromise = (async () => {
    try {
      const maskedUri = config.mongoUri.replace(/:([^:@]{3,})@/, ':****@');
      console.log(`[DB] Attempting connection to MongoDB at: ${maskedUri}`);
      await mongoose.connect(config.mongoUri, options);
      console.log('[DB] MongoDB Connected successfully.');
      return mongoose.connection;
    } catch (err) {
      cachedPromise = null;
      console.warn(`[DB] Initial MongoDB connection failed: ${err.message}`);

      // In local development, fallback to in-memory MongoDB
      if (!isVercel && (config.env === 'development' || config.env === 'test')) {
        console.log('[DB] Development mode detected: attempting in-memory Mongo fallback...');
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          memoryServer = await MongoMemoryServer.create();
          const memoryUri = memoryServer.getUri();
          await mongoose.connect(memoryUri, options);
          console.log(`[DB] In-memory MongoDB running at: ${memoryUri}`);
          return mongoose.connection;
        } catch (memErr) {
          console.error('[DB] In-memory Mongo fallback error:', memErr.message);
        }
      }

      if (isVercel) {
        console.error('[DB] FATAL: Vercel serverless function could not connect to MongoDB Atlas.');
        console.error('[DB] Please check that MONGODB_URI is configured in Vercel Project Settings -> Environment Variables, and that Network Access allows 0.0.0.0/0 in MongoDB Atlas.');
      } else {
        console.error('[DB] FATAL: Could not establish database connection.');
      }

      throw err;
    }
  })();

  return cachedPromise;
}

async function disconnectDB() {
  await mongoose.disconnect();
  cachedPromise = null;
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = {
  connectDB,
  disconnectDB,
};
