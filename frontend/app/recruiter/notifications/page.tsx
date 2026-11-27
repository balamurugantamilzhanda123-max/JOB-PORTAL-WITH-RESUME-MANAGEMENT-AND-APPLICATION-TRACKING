'use client';

import React from 'react';
import { NotificationsCenter } from '@/components/dashboard/NotificationsCenter';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';

export default function RecruiterNotificationsPage() {
  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="notifications"
      pageTitle="Recruiter Alerts & Preferences"
    >
      <NotificationsCenter />
    </DashboardShell>
  );
}
