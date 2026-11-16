const mongoose = require('mongoose');

const EmploymentStatusEnum = [
  'Currently Employed',
  'Contract Completed',
  'Resigned',
  'Contract Ended',
  'Record Revoked'
];

const EmploymentTypeEnum = [
  'Full-Time',
  'Part-Time',
  'Contract',
  'Internship',
  'Probationary'
];

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee Verification ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: EmploymentTypeEnum,
      default: 'Full-Time',
      required: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    contractEndDate: {
      type: Date,
      default: null,
    },
    lastWorkingDate: {
      type: Date,
      default: null,
    },
    employmentStatus: {
      type: String,
      enum: EmploymentStatusEnum,
      default: 'Currently Employed',
      required: true,
      index: true,
    },
    profileImage: {
      objectKey: { type: String, default: null },
      url: { type: String, default: null },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
    },
    verificationNote: {
      type: String,
      trim: true,
      default: 'Official record issued and verified by Pakiv Management.',
    },
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revocationReason: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      default: 'System',
    },
    updatedBy: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for fast public & admin search queries
EmployeeSchema.index({ fullName: 'text', employeeId: 'text', designation: 'text', department: 'text' });
EmployeeSchema.index({ isDeleted: 1, employmentStatus: 1 });
EmployeeSchema.index({ isDeleted: 1, isVerified: 1, isRevoked: 1 });

/**
 * Strips internal and sensitive data for safe public verification exposure
 */
EmployeeSchema.methods.toPublicJSON = function () {
  // If record is marked revoked, ensure status is marked clearly
  const status = this.isRevoked ? 'Record Revoked' : this.employmentStatus;
  const verified = this.isVerified && !this.isRevoked && !this.isDeleted;

  return {
    employeeId: this.employeeId,
    fullName: this.fullName,
    designation: this.designation,
    department: this.department,
    employmentType: this.employmentType,
    joiningDate: this.joiningDate,
    contractEndDate: this.contractEndDate,
    lastWorkingDate: this.lastWorkingDate,
    employmentStatus: status,
    profileImageUrl: this.profileImage?.url || null,
    verificationNote: this.verificationNote,
    isVerified: verified,
    isRevoked: this.isRevoked,
    revocationReason: this.isRevoked ? this.revocationReason : undefined,
    revokedAt: this.isRevoked ? this.revokedAt : undefined,
    verificationTimestamp: new Date().toISOString(),
    issuer: 'Pakiv (Baramulla, Jammu & Kashmir)',
  };
};

const Employee = mongoose.model('Employee', EmployeeSchema);

module.exports = {
  Employee,
  EmploymentStatusEnum,
  EmploymentTypeEnum,
};

