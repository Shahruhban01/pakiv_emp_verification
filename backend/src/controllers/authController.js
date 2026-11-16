const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Admin = require('../models/Admin');
const { success, error } = require('../utils/responseHandler');
const { logActivity } = require('../services/auditService');

/**
 * Cookie options helper for secure JWT transport
 */
function getCookieOptions(maxAgeMs) {
  const isProd = config.env === 'production';
  return {
    httpOnly: true,
    secure: isProd, // True in production over HTTPS
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!admin) {
      return error(res, 'Invalid credentials. Please verify your email and password.', 401);
    }

    if (!admin.isActive) {
      return error(res, 'This administrator account has been deactivated.', 403);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid credentials. Please verify your email and password.', 401);
    }

    // Generate JWT access & refresh tokens
    const accessToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry }
    );

    const refreshToken = jwt.sign(
      { id: admin._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiry }
    );

    // Update last login info
    const clientIp =
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      req.ip;

    admin.lastLoginAt = new Date();
    admin.lastLoginIp = clientIp;
    await admin.save();

    // Set secure HttpOnly cookies
    const oneHourMs = 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    res.cookie('access_token', accessToken, getCookieOptions(oneHourMs));
    res.cookie('refresh_token', refreshToken, getCookieOptions(sevenDaysMs));

    // Audit log
    await logActivity({
      admin,
      action: 'ADMIN_LOGIN',
      targetType: 'Admin',
      targetId: admin._id,
      details: { email: admin.email, ip: clientIp },
      req,
    });

    return success(
      res,
      {
        admin: admin.toSafeJSON(),
        accessToken,
        tokenType: 'Bearer',
      },
      'Authentication successful.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return error(res, 'Refresh token not provided.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      return error(res, 'Invalid or expired refresh token. Please log in again.', 401);
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return error(res, 'Admin account invalid or deactivated.', 401);
    }

    const newAccessToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry }
    );

    const oneHourMs = 60 * 60 * 1000;
    res.cookie('access_token', newAccessToken, getCookieOptions(oneHourMs));

    return success(
      res,
      {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
      },
      'Token refreshed successfully.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res, next) {
  try {
    if (req.admin) {
      await logActivity({
        admin: req.admin,
        action: 'ADMIN_LOGOUT',
        targetType: 'Admin',
        targetId: req.admin._id,
        details: { email: req.admin.email },
        req,
      });
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return success(res, null, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 */
async function getMe(req, res) {
  return success(res, { admin: req.admin.toSafeJSON() }, 'Current admin profile.');
}

/**
 * PATCH /api/v1/auth/me
 */
async function updateProfile(req, res, next) {
  try {
    const admin = await Admin.findById(req.admin._id).select('+password');
    const { name, currentPassword, newPassword } = req.body;

    if (name) {
      admin.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return error(res, 'Current password is required to change password.', 400);
      }
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return error(res, 'Current password does not match.', 400);
      }
      admin.password = newPassword;
    }

    await admin.save();

    await logActivity({
      admin,
      action: 'ADMIN_PROFILE_UPDATE',
      targetType: 'Admin',
      targetId: admin._id,
      details: { changedPassword: Boolean(newPassword), updatedName: Boolean(name) },
      req,
    });

    return success(res, { admin: admin.toSafeJSON() }, 'Profile updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
};

