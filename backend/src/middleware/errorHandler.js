const { error } = require('../utils/responseHandler');
const config = require('../config/env');

function notFoundHandler(req, res) {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

function globalErrorHandler(err, req, res, next) {
  console.error('[Global Error]', err);

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    return error(res, `Duplicate entry: An employee or account with ${field} '${val}' already exists.`, 409, {
      field,
      value: val,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return error(res, 'Database validation failed', 400, errors);
  }

  // Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    return error(res, `Invalid resource identifier format for '${err.path}'`, 400);
  }

  // Multer errors (File upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 'File size exceeds maximum limit of 5MB', 400);
    }
    return error(res, `File upload error: ${err.message}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token authorization', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return error(
    res,
    message,
    statusCode,
    config.env === 'development' ? { stack: err.stack } : null
  );
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};

