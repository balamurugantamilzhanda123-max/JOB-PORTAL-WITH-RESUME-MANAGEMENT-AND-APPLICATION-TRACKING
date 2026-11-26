'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { registerFormSchema, RegisterFormValues } from '@/lib/validators';
import { ApiClientError } from '@/services/api';

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'CANDIDATE',
    },
  });

  const selectedRole = watch('role');
  const passwordValue = watch('password') || '';

  const passwordChecks = [
    { label: '8+ characters', ok: passwordValue.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(passwordValue) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(passwordValue) },
    { label: 'Number & symbol', ok: /\d/.test(passwordValue) && /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerAccount(values);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);
      } else {
        setServerError('Registration failed. Please verify your details and try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Role Selector (Candidate or Recruiter only) */}
      <div className="space-y-1.5">
        <Label>Select your role</Label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setValue('role', 'CANDIDATE', { shouldValidate: true })}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all',
              selectedRole === 'CANDIDATE'
                ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <UserCheck
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                selectedRole === 'CANDIDATE' ? 'text-blue-600' : 'text-slate-400',
              )}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Candidate</p>
              <p className="text-xs text-slate-500">Career &amp; profile hub</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setValue('role', 'RECRUITER', { shouldValidate: true })}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all',
              selectedRole === 'RECRUITER'
                ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <Briefcase
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                selectedRole === 'RECRUITER' ? 'text-teal-600' : 'text-slate-400',
              )}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Recruiter</p>
              <p className="text-xs text-slate-500">Hiring manager portal</p>
            </div>
          </button>
        </div>
        {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            className="pl-9"
            aria-invalid={Boolean(errors.fullName)}
            {...register('fullName')}
          />
        </div>
        {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="alex@company.com"
            className="pl-9"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a strong password"
            className="pl-9 pr-10"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}

        {/* Live password strength checklist */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {passwordChecks.map((rule) => (
            <div
              key={rule.label}
              className={cn(
                'flex items-center gap-1.5 text-[11px]',
                rule.ok ? 'text-emerald-600' : 'text-slate-400',
              )}
            >
              <Check className="h-3 w-3 shrink-0" />
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="pl-9 pr-10"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create workspace account'
        )}
      </Button>

      <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  );
}

