'use client';

import React from 'react';
import { AccountProfilePanel } from '@/components/dashboard/AccountProfilePanel';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';

export default function RecruiterSettingsPage() {
  const { user } = useAuth();

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="settings"
      pageTitle="Recruiter Workspace Settings"
    >
      {user && (
        <div className="space-y-6">
          <AccountProfilePanel user={user} workspaceLabel="Recruiter Account Identity" />
          <SettingsPanel user={user} />
        </div>
      )}
    </DashboardShell>
  );
}
