const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    adminEmail: {
      type: String,
      default: 'system',
    },
    adminName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'ADMIN_LOGIN',
        'ADMIN_LOGOUT',
        'ADMIN_PROFILE_UPDATE',
        'CREATE_EMPLOYEE',
        'UPDATE_EMPLOYEE',
        'REVOKE_EMPLOYEE',
        'RESTORE_EMPLOYEE',
        'DELETE_EMPLOYEE',
        'UPLOAD_PHOTO',
        'DELETE_PHOTO',
        'SYSTEM_SEED'
      ],
    },
    targetType: {
      type: String,
      default: 'Employee',
      enum: ['Employee', 'Admin', 'Asset', 'System'],
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;

