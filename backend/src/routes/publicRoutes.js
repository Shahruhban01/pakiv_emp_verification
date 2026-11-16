const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const uploadController = require('../controllers/uploadController');
const { publicApiLimiter } = require('../middleware/rateLimiter');

// Public verification & search endpoints
router.get('/search', publicApiLimiter, publicController.searchEmployees);
router.get('/:employeeId/verify', publicApiLimiter, publicController.verifyEmployee);

module.exports = router;

