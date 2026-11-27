'use client';

import React from 'react';
import { NotificationsCenter } from '@/components/dashboard/NotificationsCenter';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';

export default function CandidateNotificationsPage() {
  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="notifications"
      pageTitle="Candidate Notifications"
    >
      <NotificationsCenter />
    </DashboardShell>
  );
}
