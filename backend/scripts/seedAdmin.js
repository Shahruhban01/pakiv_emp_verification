const Admin = require('../src/models/Admin');
const config = require('../src/config/env');
const { logActivity } = require('../src/services/auditService');

async function seedInitialAdmin() {
  const adminCount = await Admin.countDocuments();
  if (adminCount > 0) {
    return;
  }

  console.log('[Seed] No admin account detected. Creating initial Super Admin...');

  const superAdmin = new Admin({
    name: config.defaultAdmin.name,
    email: config.defaultAdmin.email,
    password: config.defaultAdmin.password,
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  await superAdmin.save();

  await logActivity({
    admin: superAdmin,
    action: 'SYSTEM_SEED',
    targetType: 'Admin',
    targetId: superAdmin._id,
    details: { message: 'Initial super admin provisioned.' },
  });

  console.log('----------------------------------------------------');
  console.log('✅ Initial Super Admin Created:');
  console.log(`   Email:    ${config.defaultAdmin.email}`);
  console.log(`   Password: ${config.defaultAdmin.password}`);
  console.log('----------------------------------------------------');
}

// Standalone execution support
if (require.main === module) {
  const { connectDB, disconnectDB } = require('../src/config/database');
  (async () => {
    try {
      await connectDB();
      await seedInitialAdmin();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Admin Error]', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedInitialAdmin,
};

