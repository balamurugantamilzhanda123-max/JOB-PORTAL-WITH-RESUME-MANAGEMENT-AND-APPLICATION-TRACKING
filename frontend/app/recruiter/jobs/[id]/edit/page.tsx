'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { JobFormBuilder } from '@/components/jobs/JobFormBuilder';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { jobsService } from '@/services/jobs.service';

export default function EditRecruiterJobPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const jobId = params?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['recruiter-job', jobId],
    queryFn: () => jobsService.getRecruiterJob(jobId),
    enabled: Boolean(jobId) && user?.role === 'RECRUITER',
  });

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="jobs"
      pageTitle="Edit Job Posting"
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          Loading job details...
        </div>
      ) : isError || !data?.job ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error instanceof Error ? error.message : 'Unable to load job posting.'}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <JobFormBuilder initialJob={data.job} />
      )}
    </DashboardShell>
  );
}

