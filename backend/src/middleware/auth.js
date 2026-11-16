const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Admin = require('../models/Admin');
const { error } = require('../utils/responseHandler');

/**
 * Verifies JWT token from HttpOnly cookie or Authorization header
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check cookie first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // Check Authorization header fallback
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return error(res, 'Authentication required. No session token found.', 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return error(res, 'Session expired. Please log in again.', 401, { code: 'TOKEN_EXPIRED' });
      }
      return error(res, 'Invalid authentication token.', 401);
    }

    // Verify admin in database
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return error(res, 'Admin account not found.', 401);
    }

    if (!admin.isActive) {
      return error(res, 'Admin account has been deactivated.', 403);
    }

    req.admin = admin;
    next();
  } catch (err) {
    return error(res, 'Authentication error: ' + err.message, 500);
  }
}

/**
 * Restricts access by role (e.g. SUPER_ADMIN)
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return error(res, 'Unauthorized', 401);
    }
    if (!allowedRoles.includes(req.admin.role)) {
      return error(res, 'Forbidden: Insufficient privileges', 403);
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles,
};

