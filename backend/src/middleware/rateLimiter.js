const rateLimit = require('express-rate-limit');
const { error } = require('../utils/responseHandler');

const rateLimitHandler = (message) => (req, res) => {
  return error(
    res,
    message || 'Too many requests from this IP address. Please try again later.',
    429
  );
};

// Rate limiter for admin login (Strict: 10 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Please try again after 15 minutes.'),
});

// Rate limiter for public search & verification
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many verification requests. Please slow down.'),
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Upload rate limit reached. Please wait before uploading again.'),
});

// General API protection limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('API rate limit exceeded. Please wait a moment.'),
});

module.exports = {
  loginLimiter,
  publicApiLimiter,
  uploadLimiter,
  generalApiLimiter,
};

