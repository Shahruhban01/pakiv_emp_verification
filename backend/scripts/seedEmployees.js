const { Employee } = require('../src/models/Employee');
const { logActivity } = require('../src/services/auditService');

const SAMPLE_EMPLOYEES = [
  {
    employeeId: '20251003',
    fullName: 'Faizan Ahmad Mir',
    designation: 'Senior Full-Stack Engineer',
    department: 'Technology & Engineering',
    employmentType: 'Full-Time',
    joiningDate: new Date('2023-04-10'),
    contractEndDate: null,
    lastWorkingDate: null,
    employmentStatus: 'Currently Employed',
    profileImage: {
      objectKey: 'sample/faizan-mir.jpg',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      size: 142000,
      mimeType: 'image/jpeg',
    },
    verificationNote: 'Official engineering credential issued by Pakiv Corporate Office, Baramulla, J&K.',
    isVerified: true,
    isRevoked: false,
    createdBy: 'Initial Seed',
  },
  {
    employeeId: '20240412',
    fullName: 'Zainab Rashid Wani',
    designation: 'Lead Product & UI/UX Designer',
    department: 'Design & User Experience',
    employmentType: 'Full-Time',
    joiningDate: new Date('2024-01-15'),
    contractEndDate: null,
    lastWorkingDate: null,
    employmentStatus: 'Currently Employed',
    profileImage: {
      objectKey: 'sample/zainab-wani.jpg',
      url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
      size: 156000,
      mimeType: 'image/jpeg',
    },
    verificationNote: 'Verified member of Pakiv Design Team. Active in good standing.',
    isVerified: true,
    isRevoked: false,
    createdBy: 'Initial Seed',
  },
  {
    employeeId: '20230819',
    fullName: 'Umar Farooq Shah',
    designation: 'Senior Cloud Architect',
    department: 'Cloud Infrastructure & Security',
    employmentType: 'Contract',
    joiningDate: new Date('2023-08-01'),
    contractEndDate: new Date('2024-08-01'),
    lastWorkingDate: new Date('2024-08-01'),
    employmentStatus: 'Contract Completed',
    profileImage: {
      objectKey: 'sample/umar-shah.jpg',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
      size: 135000,
      mimeType: 'image/jpeg',
    },
    verificationNote: 'Completed 12-month cloud modernization project with commendable distinction.',
    isVerified: true,
    isRevoked: false,
    createdBy: 'Initial Seed',
  },
  {
    employeeId: '20220205',
    fullName: 'Tanveer Hussain Lone',
    designation: 'Operations Analyst',
    department: 'Business Operations',
    employmentType: 'Full-Time',
    joiningDate: new Date('2022-02-15'),
    contractEndDate: null,
    lastWorkingDate: new Date('2024-03-31'),
    employmentStatus: 'Resigned',
    profileImage: {
      objectKey: 'sample/tanveer-lone.jpg',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
      size: 148000,
      mimeType: 'image/jpeg',
    },
    verificationNote: 'Formally resigned and relieved of all operational duties. Clear dues record.',
    isVerified: true,
    isRevoked: false,
    createdBy: 'Initial Seed',
  },
  {
    employeeId: '20210611',
    fullName: 'Sample Discredited Record',
    designation: 'Former Field Associate',
    department: 'Field Services',
    employmentType: 'Contract',
    joiningDate: new Date('2021-06-01'),
    contractEndDate: new Date('2021-09-30'),
    lastWorkingDate: new Date('2021-09-30'),
    employmentStatus: 'Record Revoked',
    profileImage: {
      objectKey: 'sample/revoked-sample.jpg',
      url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
      size: 130000,
      mimeType: 'image/jpeg',
    },
    verificationNote: 'NOTICE: This verification credential was formally revoked by Pakiv Administration.',
    isVerified: false,
    isRevoked: true,
    revocationReason: 'Credential officially revoked following administrative review.',
    revokedAt: new Date('2024-01-10'),
    revokedBy: 'Pakiv Compliance Authority',
    createdBy: 'Initial Seed',
  },
];

async function seedSampleEmployees(force = false) {
  const count = await Employee.countDocuments();
  if (count > 0 && !force) {
    return;
  }

  console.log('[Seed] Seeding realistic sample employee verification records...');

  for (const emp of SAMPLE_EMPLOYEES) {
    await Employee.findOneAndUpdate(
      { employeeId: emp.employeeId },
      emp,
      { upsert: true, new: true }
    );
  }

  await logActivity({
    action: 'SYSTEM_SEED',
    targetType: 'Employee',
    details: { message: `Seeded ${SAMPLE_EMPLOYEES.length} sample records for testing.` },
  });

  console.log(`✅ Seeded ${SAMPLE_EMPLOYEES.length} sample employee records.`);
}

// Standalone execution support
if (require.main === module) {
  const { connectDB, disconnectDB } = require('../src/config/database');
  (async () => {
    try {
      await connectDB();
      await seedSampleEmployees(true);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Employees Error]', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedSampleEmployees,
  SAMPLE_EMPLOYEES,
};

