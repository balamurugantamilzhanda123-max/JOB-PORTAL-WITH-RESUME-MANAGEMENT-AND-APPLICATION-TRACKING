'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Sidebar, SidebarNavItem } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/hooks/useAuth';
import { useUserRealtimeStream } from '@/hooks/useUserRealtimeStream';
import { getDashboardRouteForRole } from '@/lib/utils';
import { UserRole } from '@/types';

interface DashboardShellProps {
  requiredRole: UserRole;
  navItems: SidebarNavItem[];
  activeView: string;
  onSelectView?: (viewId: string) => void;
  pageTitle: string;
  children: React.ReactNode;
}

export function DashboardShell({
  requiredRole,
  navItems,
  activeView,
  onSelectView,
  pageTitle,
  children,
}: DashboardShellProps) {
  const { user, isLoading, logout } = useAuth();
  useUserRealtimeStream(Boolean(user && user.role === requiredRole));
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSelectView = (viewId: string) => {
    if (onSelectView) {
      onSelectView(viewId);
      return;
    }
    const base = getDashboardRouteForRole(requiredRole);
    router.push(viewId === 'overview' ? base : `${base}?view=${viewId}`);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== requiredRole) {
      router.replace(getDashboardRouteForRole(user.role));
    }
  }, [isLoading, user, requiredRole, router]);

  if (isLoading || !user || user.role !== requiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Verifying secure workspace access...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Sidebar
        role={requiredRole}
        items={navItems}
        activeView={activeView}
        onSelectView={handleSelectView}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          user={user}
          title={pageTitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onNavigateView={handleSelectView}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

