const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { loginSchema, updateProfileSchema } = require('../validators/authValidator');

// Public auth routes
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected auth routes
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validateBody(updateProfileSchema), authController.updateProfile);

module.exports = router;

