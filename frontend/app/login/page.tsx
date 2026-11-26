'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/authentication/AuthLayout';
import { LoginForm } from '@/components/authentication/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/utils';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getDashboardRouteForRole(user.role));
    }
  }, [user, isLoading, router]);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your verified TalentForge account to access your workspace."
    >
      <LoginForm />
    </AuthLayout>
  );
}

