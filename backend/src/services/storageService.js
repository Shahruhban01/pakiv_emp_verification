const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config/env');
const { getR2Client } = require('../config/r2');

// Local upload fallback directory (uses /tmp on serverless environments like Vercel)
const LOCAL_UPLOAD_DIR = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(__dirname, '../../uploads');

// Ensure local fallback directory exists
try {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  // Ignore permission errors in serverless initialization if unneeded
}

/**
 * Validates file buffer magic bytes or mime type
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function validateImageFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit of 5MB (${(file.size / (1024 * 1024)).toFixed(2)} MB uploaded)`);
  }
}

/**
 * Uploads an employee photo to Cloudflare R2 (or local fallback if unconfigured)
 */
async function uploadProfilePhoto(file, employeeId = 'general') {
  validateImageFile(file);

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const cleanId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const objectKey = `employees/photos/${cleanId}-${Date.now()}-${uniqueSuffix}${ext}`;

  const r2 = getR2Client();

  if (r2) {
    // Upload directly to Cloudflare R2
    const uploadParams = {
      Bucket: config.r2.bucketName,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        employeeId: cleanId,
        originalName: encodeURIComponent(file.originalname),
        uploadedAt: new Date().toISOString(),
      },
    };

    await r2.send(new PutObjectCommand(uploadParams));

    // Determine public delivery URL
    let deliveryUrl;
    if (config.r2.publicUrl) {
      deliveryUrl = `${config.r2.publicUrl.replace(/\/$/, '')}/${objectKey}`;
    } else {
      // Use backend controlled delivery endpoint
      deliveryUrl = `/api/v1/uploads/${encodeURIComponent(objectKey)}`;
    }

    return {
      objectKey,
      url: deliveryUrl,
      size: file.size,
      mimeType: file.mimetype,
      storageType: 'r2',
    };
  }

  // Local fallback mode for development without R2 credentials
  const sanitizedFilename = objectKey.replace(/\//g, '_');
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, sanitizedFilename);
  fs.writeFileSync(localFilePath, file.buffer);

  return {
    objectKey,
    url: `/api/v1/uploads/${encodeURIComponent(objectKey)}`,
    size: file.size,
    mimeType: file.mimetype,
    storageType: 'local',
  };
}

/**
 * Deletes a file from Cloudflare R2 or local storage
 */
async function deleteFile(objectKey) {
  if (!objectKey) return;

  const r2 = getR2Client();

  if (r2) {
    try {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: config.r2.bucketName,
          Key: objectKey,
        })
      );
      return;
    } catch (err) {
      console.warn(`[Storage] Failed to delete from R2: ${err.message}`);
    }
  }

  // Check local fallback
  const sanitizedFilename = objectKey.replace(/\//g, '_');
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, sanitizedFilename);
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
    } catch (err) {
      console.warn(`[Storage] Failed to delete local file: ${err.message}`);
    }
  }
}

/**
 * Retrieves file stream for controlled delivery endpoint
 */
async function getFileStream(objectKey) {
  const r2 = getR2Client();

  if (r2) {
    try {
      const command = new GetObjectCommand({
        Bucket: config.r2.bucketName,
        Key: objectKey,
      });
      const response = await r2.send(command);
      return {
        stream: response.Body,
        contentType: response.ContentType || 'image/jpeg',
        contentLength: response.ContentLength,
      };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  // Local fallback
  const sanitizedFilename = objectKey.replace(/\//g, '_');
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, sanitizedFilename);
  if (fs.existsSync(localFilePath)) {
    const ext = path.extname(localFilePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const stat = fs.statSync(localFilePath);
    return {
      stream: fs.createReadStream(localFilePath),
      contentType: mimeMap[ext] || 'application/octet-stream',
      contentLength: stat.size,
    };
  }

  return null;
}

module.exports = {
  uploadProfilePhoto,
  deleteFile,
  getFileStream,
  validateImageFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};

