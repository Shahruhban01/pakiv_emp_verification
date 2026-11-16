const { error } = require('../utils/responseHandler');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err) {
      if (err.errors) {
        const formatted = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return error(res, 'Validation error in request body', 400, formatted);
      }
      return error(res, 'Invalid request payload', 400);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (err) {
      if (err.errors) {
        const formatted = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return error(res, 'Validation error in query parameters', 400, formatted);
      }
      return error(res, 'Invalid query parameters', 400);
    }
  };
}

module.exports = {
  validateBody,
  validateQuery,
};

