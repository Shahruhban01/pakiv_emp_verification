const { z } = require('zod');
const { EmploymentStatusEnum, EmploymentTypeEnum } = require('../models/Employee');

const createEmployeeSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(3, 'Employee ID must be at least 3 characters')
    .max(30, 'Employee ID must be at most 30 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Employee ID must only contain letters, numbers, hyphens, and underscores')
    .optional(),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  designation: z
    .string({ required_error: 'Designation is required' })
    .trim()
    .min(2, 'Designation must be at least 2 characters')
    .max(100, 'Designation cannot exceed 100 characters'),
  department: z
    .string({ required_error: 'Department is required' })
    .trim()
    .min(2, 'Department must be at least 2 characters')
    .max(100, 'Department cannot exceed 100 characters'),
  employmentType: z
    .enum(EmploymentTypeEnum, {
      errorMap: () => ({ message: `Employment type must be one of: ${EmploymentTypeEnum.join(', ')}` }),
    })
    .default('Full-Time'),
  joiningDate: z
    .string({ required_error: 'Joining date is required' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid joining date format' }),
  contractEndDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid contract end date format' }),
  lastWorkingDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid last working date format' }),
  employmentStatus: z
    .enum(EmploymentStatusEnum, {
      errorMap: () => ({ message: `Employment status must be one of: ${EmploymentStatusEnum.join(', ')}` }),
    })
    .default('Currently Employed'),
  profileImage: z
    .object({
      objectKey: z.string().optional().nullable(),
      url: z.string().optional().nullable(),
      size: z.number().optional().nullable(),
      mimeType: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  verificationNote: z
    .string()
    .max(1000, 'Verification note cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const revokeEmployeeSchema = z.object({
  reason: z
    .string({ required_error: 'Revocation reason is required' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  revokeEmployeeSchema,
};

