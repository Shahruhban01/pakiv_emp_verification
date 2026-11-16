const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/database');
const { seedInitialAdmin } = require('./scripts/seedAdmin');
const { seedSampleEmployees } = require('./scripts/seedEmployees');

let server;

async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log(`Starting ${config.appName}...`);
    console.log(`Environment: ${config.env}`);
    console.log('----------------------------------------------------');

    // 1. Connect to Database
    await connectDB();

    // 2. Ensure Super Admin exists
    await seedInitialAdmin();

    // 3. Ensure Realistic Sample Data exists if empty
    await seedSampleEmployees();

    // 4. Start HTTP Server
    server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🚀 Pakiv Employee Verification Server is running!`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🌐 Public Verification: http://localhost:${config.port}/`);
      console.log(`🛡️  Admin Portal: http://localhost:${config.port}/admin/login.html`);
      console.log(`📑 API Base: http://localhost:${config.port}/api/v1`);
      console.log('====================================================');
    });

  } catch (err) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDB();
      console.log('Database disconnected.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

