/**
 * ============================================================================
 * VERCEL SERVERLESS FUNCTION HANDLER
 * Exports Express API for Vercel Serverless Function execution
 * ============================================================================
 */

const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/database');
const { seedInitialAdmin } = require('../backend/scripts/seedAdmin');
const { seedSampleEmployees } = require('../backend/scripts/seedEmployees');

let initialized = false;

module.exports = async (req, res) => {
  // 1. Establish/reuse cached MongoDB connection
  await connectDB();

  // 2. Perform one-time check per cold-start instance to ensure super admin & samples exist
  if (!initialized) {
    try {
      await seedInitialAdmin();
      await seedSampleEmployees();
      initialized = true;
    } catch (err) {
      console.warn('[Vercel] Auto-seeding check skipped:', err.message);
    }
  }

  // 3. Delegate request handling to Express app
  return app(req, res);
};

