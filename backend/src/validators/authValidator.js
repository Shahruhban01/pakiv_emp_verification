const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(128, 'Password is too long'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
});

module.exports = {
  loginSchema,
  updateProfileSchema,
};

