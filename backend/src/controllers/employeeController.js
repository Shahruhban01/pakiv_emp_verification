const { Employee } = require('../models/Employee');
const { generateEmployeeId } = require('../utils/idGenerator');
const { success, error } = require('../utils/responseHandler');
const { logActivity } = require('../services/auditService');
const { deleteFile } = require('../services/storageService');

/**
 * GET /api/v1/admin/employees/stats
 */
async function getEmployeeStats(req, res, next) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      currentlyEmployed,
      contractCompleted,
      resigned,
      contractEnded,
      revoked,
      recentlyAdded,
    ] = await Promise.all([
      Employee.countDocuments({ isDeleted: false }),
      Employee.countDocuments({ isDeleted: false, employmentStatus: 'Currently Employed', isRevoked: false }),
      Employee.countDocuments({ isDeleted: false, employmentStatus: 'Contract Completed', isRevoked: false }),
      Employee.countDocuments({ isDeleted: false, employmentStatus: 'Resigned', isRevoked: false }),
      Employee.countDocuments({ isDeleted: false, employmentStatus: 'Contract Ended', isRevoked: false }),
      Employee.countDocuments({ isDeleted: false, isRevoked: true }),
      Employee.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    return success(
      res,
      {
        total,
        currentlyEmployed,
        contractCompleted,
        resigned,
        contractEnded,
        revoked,
        recentlyAdded,
      },
      'Dashboard stats retrieved.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/employees/generate-id
 */
async function getNextEmployeeId(req, res, next) {
  try {
    const candidateId = await generateEmployeeId();
    return success(res, { candidateId }, 'Generated unique employee ID.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/employees
 */
async function listEmployees(req, res, next) {
  try {
    const { q, status, department, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { isDeleted: false };

    if (status) {
      if (status === 'Revoked') {
        filter.isRevoked = true;
      } else {
        filter.employmentStatus = status;
        filter.isRevoked = false;
      }
    }

    if (department) {
      filter.department = department;
    }

    if (q && q.trim()) {
      const clean = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(clean, 'i');
      filter.$or = [
        { employeeId: regex },
        { fullName: regex },
        { designation: regex },
        { department: regex },
      ];
    }

    const [total, employees] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit),
    ]);

    return success(res, employees, 'Employees retrieved successfully.', 200, {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/employees
 */
async function createEmployee(req, res, next) {
  try {
    const payload = { ...req.body };

    // Auto-generate employeeId if not provided
    if (!payload.employeeId || !payload.employeeId.trim()) {
      payload.employeeId = await generateEmployeeId();
    } else {
      payload.employeeId = payload.employeeId.trim().toUpperCase();
      // Check uniqueness
      const existing = await Employee.findOne({ employeeId: payload.employeeId });
      if (existing) {
        return error(res, `Employee with ID '${payload.employeeId}' already exists.`, 409);
      }
    }

    payload.createdBy = req.admin?.name || req.admin?.email || 'Admin';
    payload.updatedBy = payload.createdBy;

    const employee = await Employee.create(payload);

    await logActivity({
      admin: req.admin,
      action: 'CREATE_EMPLOYEE',
      targetType: 'Employee',
      targetId: employee.employeeId,
      details: {
        fullName: employee.fullName,
        designation: employee.designation,
        department: employee.department,
        status: employee.employmentStatus,
      },
      req,
    });

    return success(res, employee, 'Employee created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/employees/:id
 */
async function getEmployeeById(req, res, next) {
  try {
    const { id } = req.params;

    // Check by _id or employeeId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { employeeId: id.toUpperCase() };

    const employee = await Employee.findOne(query);

    if (!employee || employee.isDeleted) {
      return error(res, 'Employee record not found.', 404);
    }

    return success(res, employee, 'Employee details retrieved.');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/employees/:id
 */
async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { employeeId: id.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee || employee.isDeleted) {
      return error(res, 'Employee record not found.', 404);
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If changing employeeId, verify uniqueness
    if (updates.employeeId && updates.employeeId.toUpperCase() !== employee.employeeId) {
      updates.employeeId = updates.employeeId.trim().toUpperCase();
      const existing = await Employee.findOne({ employeeId: updates.employeeId });
      if (existing) {
        return error(res, `Employee with ID '${updates.employeeId}' already exists.`, 409);
      }
    }

    updates.updatedBy = req.admin?.name || req.admin?.email || 'Admin';

    Object.assign(employee, updates);
    await employee.save();

    await logActivity({
      admin: req.admin,
      action: 'UPDATE_EMPLOYEE',
      targetType: 'Employee',
      targetId: employee.employeeId,
      details: { updatedFields: Object.keys(updates) },
      req,
    });

    return success(res, employee, 'Employee updated successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/employees/:id/revoke
 */
async function revokeEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { employeeId: id.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee || employee.isDeleted) {
      return error(res, 'Employee record not found.', 404);
    }

    employee.isRevoked = true;
    employee.employmentStatus = 'Record Revoked';
    employee.revocationReason = reason || 'Revoked by administration.';
    employee.revokedAt = new Date();
    employee.revokedBy = req.admin?.name || req.admin?.email || 'Admin';
    employee.updatedBy = employee.revokedBy;

    await employee.save();

    await logActivity({
      admin: req.admin,
      action: 'REVOKE_EMPLOYEE',
      targetType: 'Employee',
      targetId: employee.employeeId,
      details: { reason: employee.revocationReason },
      req,
    });

    return success(res, employee, 'Employee record has been revoked.');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/employees/:id/restore
 */
async function restoreEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { employeeId: id.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee) {
      return error(res, 'Employee record not found.', 404);
    }

    employee.isRevoked = false;
    employee.isDeleted = false;
    employee.employmentStatus = 'Currently Employed';
    employee.revocationReason = null;
    employee.revokedAt = null;
    employee.revokedBy = null;
    employee.deletedAt = null;
    employee.updatedBy = req.admin?.name || req.admin?.email || 'Admin';

    await employee.save();

    await logActivity({
      admin: req.admin,
      action: 'RESTORE_EMPLOYEE',
      targetType: 'Employee',
      targetId: employee.employeeId,
      details: { restoredBy: employee.updatedBy },
      req,
    });

    return success(res, employee, 'Employee record has been restored to active status.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/employees/:id
 * Soft deletion by default to preserve verification audit history
 */
async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { employeeId: id.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee) {
      return error(res, 'Employee record not found.', 404);
    }

    if (permanent) {
      // Remove profile image if present
      if (employee.profileImage?.objectKey) {
        await deleteFile(employee.profileImage.objectKey);
      }
      await Employee.deleteOne({ _id: employee._id });

      await logActivity({
        admin: req.admin,
        action: 'DELETE_EMPLOYEE',
        targetType: 'Employee',
        targetId: employee.employeeId,
        details: { permanent: true, fullName: employee.fullName },
        req,
      });

      return success(res, null, 'Employee record permanently deleted.');
    }

    // Soft deletion
    employee.isDeleted = true;
    employee.deletedAt = new Date();
    employee.updatedBy = req.admin?.name || req.admin?.email || 'Admin';
    await employee.save();

    await logActivity({
      admin: req.admin,
      action: 'DELETE_EMPLOYEE',
      targetType: 'Employee',
      targetId: employee.employeeId,
      details: { permanent: false, fullName: employee.fullName },
      req,
    });

    return success(res, null, 'Employee record archived (soft-deleted).');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployeeStats,
  getNextEmployeeId,
  listEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  revokeEmployee,
  restoreEmployee,
  deleteEmployee,
};

