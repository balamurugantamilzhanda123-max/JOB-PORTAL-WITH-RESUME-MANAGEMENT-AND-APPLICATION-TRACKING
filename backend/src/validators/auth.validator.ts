import { z } from 'zod';

export const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters'),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(255, 'Email address is too long'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        passwordPolicyRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
    role: z.enum(['CANDIDATE', 'RECRUITER', 'ADMIN'], {
      required_error: 'Role selection is required',
      invalid_type_error: 'Invalid role selected',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  rememberMe: z.boolean().optional().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

