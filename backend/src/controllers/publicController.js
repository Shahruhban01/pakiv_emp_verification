const { Employee } = require('../models/Employee');
const { success, error } = require('../utils/responseHandler');

/**
 * GET /api/v1/employees/search?q=&page=&limit=
 * Public search for matching employees by name, verification ID, or designation
 */
async function searchEmployees(req, res, next) {
  try {
    const rawQuery = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    // Base filter: exclude soft-deleted records
    const filter = { isDeleted: false };

    if (rawQuery) {
      // Escape special regex characters to prevent regex injection
      const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      filter.$or = [
        { employeeId: regex },
        { fullName: regex },
        { designation: regex },
        { department: regex },
      ];
    }

    const [total, records] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const sanitizedRecords = records.map((emp) => emp.toPublicJSON());

    return success(
      res,
      sanitizedRecords,
      'Employees retrieved successfully.',
      200,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        query: rawQuery,
      }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/employees/:employeeId/verify
 * Public endpoint to verify an individual employee record
 */
async function verifyEmployee(req, res, next) {
  try {
    const { employeeId } = req.params;

    if (!employeeId || employeeId.trim().length === 0) {
      return error(res, 'Employee Verification ID is required.', 400);
    }

    const cleanId = employeeId.trim().toUpperCase();

    // Query non-deleted records
    const employee = await Employee.findOne({
      employeeId: cleanId,
      isDeleted: false,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        code: 'RECORD_NOT_FOUND',
        message: 'Employee Record Not Found',
        details: `No official employment record was found matching ID: ${cleanId}.`,
        queriedId: cleanId,
        issuer: 'Pakiv (Baramulla, Jammu & Kashmir)',
        timestamp: new Date().toISOString(),
      });
    }

    const publicData = employee.toPublicJSON();

    return success(
      res,
      publicData,
      employee.isRevoked
        ? 'Employee Record Revoked - Not Valid'
        : 'Official Pakiv Employee Record Verified.',
      200,
      {
        verifiedAt: new Date().toISOString(),
        canonicalUrl: `https://employees.pakiv.com/verifyemp?id=${employee.employeeId}`,
      }
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchEmployees,
  verifyEmployee,
};

