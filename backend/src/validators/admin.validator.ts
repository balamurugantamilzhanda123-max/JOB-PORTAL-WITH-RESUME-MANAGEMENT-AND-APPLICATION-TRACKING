import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role value',
  }),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive flag is required',
    invalid_type_error: 'isActive must be a boolean',
  }),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

