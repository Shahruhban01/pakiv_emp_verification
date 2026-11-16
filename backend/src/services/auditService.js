const AuditLog = require('../models/AuditLog');

async function logActivity({
  admin,
  action,
  targetType = 'Employee',
  targetId = null,
  details = {},
  req = null,
}) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress =
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip;
      userAgent = req.headers['user-agent'] || null;
    }

    await AuditLog.create({
      adminId: admin?._id || admin?.id || null,
      adminEmail: admin?.email || 'system',
      adminName: admin?.name || 'System',
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
  }
}

module.exports = {
  logActivity,
};

