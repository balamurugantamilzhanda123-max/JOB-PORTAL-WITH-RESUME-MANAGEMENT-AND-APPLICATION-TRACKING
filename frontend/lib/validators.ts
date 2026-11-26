import { z } from 'zod';

export const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export const loginFormSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const registerFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        passwordPolicyRegex,
        'Include uppercase, lowercase, number, and special character',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['CANDIDATE', 'RECRUITER'], {
      required_error: 'Please select your account role',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

