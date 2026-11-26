'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/authentication/AuthLayout';
import { RegisterForm } from '@/components/authentication/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/utils';

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getDashboardRouteForRole(user.role));
    }
  }, [user, isLoading, router]);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a Candidate or Recruiter to launch your Phase 1 workspace."
    >
      <RegisterForm />
    </AuthLayout>
  );
}

