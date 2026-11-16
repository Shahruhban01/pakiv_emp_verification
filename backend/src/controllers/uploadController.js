const multer = require('multer');
const {
  uploadProfilePhoto,
  deleteFile,
  getFileStream,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} = require('../services/storageService');
const { success, error } = require('../utils/responseHandler');
const { logActivity } = require('../services/auditService');

// Multer memory storage configuration
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP.`));
    }
  },
});

/**
 * POST /api/v1/admin/uploads/profile-image
 */
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return error(res, 'No image file uploaded.', 400);
    }

    const employeeId = req.body.employeeId || 'temp';
    const uploadResult = await uploadProfilePhoto(req.file, employeeId);

    await logActivity({
      admin: req.admin,
      action: 'UPLOAD_PHOTO',
      targetType: 'Asset',
      targetId: uploadResult.objectKey,
      details: {
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        storageType: uploadResult.storageType,
      },
      req,
    });

    return success(res, uploadResult, 'Photo uploaded successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/uploads/:objectKey
 */
async function deleteUploadedImage(req, res, next) {
  try {
    const objectKey = decodeURIComponent(req.params.objectKey);
    if (!objectKey) {
      return error(res, 'Object key is required.', 400);
    }

    await deleteFile(objectKey);

    await logActivity({
      admin: req.admin,
      action: 'DELETE_PHOTO',
      targetType: 'Asset',
      targetId: objectKey,
      details: { objectKey },
      req,
    });

    return success(res, null, 'Image deleted successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/uploads/:objectKey
 * Controlled public delivery endpoint for employee photos
 */
async function deliverImage(req, res, next) {
  try {
    const objectKey = decodeURIComponent(req.params.objectKey);
    if (!objectKey) {
      return error(res, 'Object key is required.', 400);
    }

    // Security check: prevent directory traversal
    if (objectKey.includes('..')) {
      return error(res, 'Invalid object key.', 400);
    }

    const file = await getFileStream(objectKey);
    if (!file) {
      return error(res, 'Image not found.', 404);
    }

    res.setHeader('Content-Type', file.contentType);
    if (file.contentLength) {
      res.setHeader('Content-Length', file.contentLength);
    }
    // Set caching headers for fast repeat loads
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    file.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadMiddleware,
  uploadImage,
  deleteUploadedImage,
  deliverImage,
};

