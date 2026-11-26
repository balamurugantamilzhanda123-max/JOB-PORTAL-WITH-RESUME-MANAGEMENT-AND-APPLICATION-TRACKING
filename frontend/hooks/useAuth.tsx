'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getDashboardRouteForRole } from '@/lib/utils';
import { LoginFormValues, RegisterFormValues } from '@/lib/validators';
import { authService } from '@/services/auth.service';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (values: LoginFormValues) => Promise<User>;
  register: (values: RegisterFormValues) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (values: LoginFormValues): Promise<User> => {
      const data = await authService.login(values);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.fullName}`);
      router.replace(getDashboardRouteForRole(data.user.role));
      return data.user;
    },
    [router],
  );

  const register = useCallback(
    async (values: RegisterFormValues): Promise<User> => {
      const data = await authService.register(values);
      setUser(data.user);
      toast.success('Account created successfully');
      router.replace(getDashboardRouteForRole(data.user.role));
      return data.user;
    },
    [router],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      toast.success('Signed out securely');
      router.replace('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

