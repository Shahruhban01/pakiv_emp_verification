const AuditLog = require('../models/AuditLog');
const { success } = require('../utils/responseHandler');

/**
 * GET /api/v1/admin/audit-logs
 */
async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.targetId) {
      filter.targetId = req.query.targetId;
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return success(res, logs, 'Audit logs retrieved.', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs,
};

