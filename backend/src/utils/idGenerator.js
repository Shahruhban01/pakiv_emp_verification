const { Employee } = require('../models/Employee');

/**
 * Generates next sequential unique employee verification ID
 * Format: YYYYMMXXX (e.g. 202611001, 20251003)
 */
async function generateEmployeeId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}${month}`;

  // Find highest existing ID starting with this prefix
  const regex = new RegExp(`^${prefix}\\d{3,4}$`);
  const latestEmployee = await Employee.findOne({ employeeId: regex })
    .sort({ employeeId: -1 })
    .select('employeeId')
    .lean();

  if (!latestEmployee || !latestEmployee.employeeId) {
    return `${prefix}001`;
  }

  const existingNumStr = latestEmployee.employeeId.slice(prefix.length);
  const nextNum = parseInt(existingNumStr, 10) + 1;
  const paddedNext = String(nextNum).padStart(3, '0');

  const candidateId = `${prefix}${paddedNext}`;

  // Ensure absolute uniqueness
  const exists = await Employee.exists({ employeeId: candidateId });
  if (exists) {
    // Fallback: random 4-digit suffix
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
  }

  return candidateId;
}

module.exports = {
  generateEmployeeId,
};

