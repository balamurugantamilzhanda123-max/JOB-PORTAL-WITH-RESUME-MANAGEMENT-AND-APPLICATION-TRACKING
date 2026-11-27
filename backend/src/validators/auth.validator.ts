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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        passwordPolicyRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  headline: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  bio: z.string().trim().max(4000).optional().nullable(),
  experienceSummary: z.string().trim().max(4000).optional().nullable(),
  education: z.string().trim().max(2000).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  portfolioUrl: z.string().trim().url('Enter a valid URL').max(500).optional().nullable().or(z.literal('')),
  profileVisible: z.boolean().optional(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  interviewReminders: z.boolean().optional(),
  marketingUpdates: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

