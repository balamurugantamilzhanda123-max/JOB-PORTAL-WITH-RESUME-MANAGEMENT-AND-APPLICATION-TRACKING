'use client';

import React from 'react';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';

export default function CandidateSettingsPage() {
  const { user } = useAuth();

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="settings"
      pageTitle="Account & Security Settings"
    >
      {user && <SettingsPanel user={user} />}
    </DashboardShell>
  );
}
