const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Admin file upload endpoints (protected)
router.post(
  '/profile-image',
  authenticate,
  uploadLimiter,
  uploadController.uploadMiddleware.single('image'),
  uploadController.uploadImage
);

router.delete('/:objectKey', authenticate, uploadController.deleteUploadedImage);

module.exports = router;

