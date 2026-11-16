const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  revokeEmployeeSchema,
} = require('../validators/employeeValidator');

// All admin employee routes require authentication
router.use(authenticate);

// Utility and stats routes
router.get('/stats', employeeController.getEmployeeStats);
router.get('/generate-id', employeeController.getNextEmployeeId);

// Employee CRUD
router.get('/', employeeController.listEmployees);
router.post('/', validateBody(createEmployeeSchema), employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.patch('/:id', validateBody(updateEmployeeSchema), employeeController.updateEmployee);
router.patch('/:id/revoke', validateBody(revokeEmployeeSchema), employeeController.revokeEmployee);
router.patch('/:id/restore', employeeController.restoreEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;

