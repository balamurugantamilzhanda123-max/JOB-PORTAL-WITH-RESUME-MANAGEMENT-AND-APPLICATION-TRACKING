'use client';

import React from 'react';
import { AccountProfilePanel } from '@/components/dashboard/AccountProfilePanel';
import { ProfileEditorPanel } from '@/components/dashboard/ProfileEditorPanel';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';

export default function CandidateProfilePage() {
  const { user } = useAuth();

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="profile"
      pageTitle="Candidate Profile"
    >
      {user && (
        <div className="space-y-6">
          <AccountProfilePanel user={user} workspaceLabel="Candidate Account Identity" />
          <ProfileEditorPanel user={user} />
        </div>
      )}
    </DashboardShell>
  );
}
