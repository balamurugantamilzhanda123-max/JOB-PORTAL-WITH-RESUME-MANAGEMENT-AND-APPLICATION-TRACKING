'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { KanbanPipelineBoard } from '@/components/ats/KanbanPipelineBoard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { atsService } from '@/services/ats.service';

export default function RecruiterJobAtsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const jobId = params?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['recruiter-job-applicants', jobId],
    queryFn: () => atsService.listJobApplicants(jobId),
    enabled: Boolean(jobId) && user?.role === 'RECRUITER',
  });

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="jobs"
      pageTitle="ATS Kanban Pipeline"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/recruiter/jobs">
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Link>
          </Button>
          {data?.job && (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{data.job.title}</h2>
                <Badge variant="emerald">{data.job.status}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {data.job.company} • {data.applications.length} total applicant(s) sorted by match score
              </p>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Loading ATS pipeline...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load applicants.'}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <KanbanPipelineBoard applications={data?.applications ?? []} />
      )}
    </DashboardShell>
  );
}

