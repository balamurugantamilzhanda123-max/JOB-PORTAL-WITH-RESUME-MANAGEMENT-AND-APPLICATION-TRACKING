'use client';

import React from 'react';
import { JobFormBuilder } from '@/components/jobs/JobFormBuilder';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';

export default function NewRecruiterJobPage() {
  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="jobs"
      pageTitle="Create Job Posting"
    >
      <JobFormBuilder />
    </DashboardShell>
  );
}

