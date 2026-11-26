'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Info, Loader2, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { loginFormSchema, LoginFormValues } from '@/lib/validators';
import { ApiClientError } from '@/services/api';

export function LoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);
      } else {
        setServerError('Unable to sign in right now. Please try again.');
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

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            className="pl-9"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Password Recovery (Phase 1 Notice)
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm leading-relaxed text-slate-600">
                  Self-service password reset links and transactional email delivery are scheduled for a subsequent phase. In Phase 1, please contact your TalentForge system administrator to verify or reset account access.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
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
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            {...register('rememberMe')}
          />
          <span>Remember me for 7 days</span>
        </label>
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in to workspace'
        )}
      </Button>

      <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}

