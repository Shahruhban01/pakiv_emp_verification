const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const publicRoutes = require('./publicRoutes');
const employeeRoutes = require('./employeeRoutes');
const uploadRoutes = require('./uploadRoutes');
const auditRoutes = require('./auditRoutes');
const uploadController = require('../controllers/uploadController');

// System Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Pakiv Employee Verification API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Controlled public image delivery
router.get('/uploads/:objectKey', uploadController.deliverImage);

// Public verification routes
router.use('/employees', publicRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Admin protected routes
router.use('/admin/employees', employeeRoutes);
router.use('/admin/uploads', uploadRoutes);
router.use('/admin/audit-logs', auditRoutes);

module.exports = router;

