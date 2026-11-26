'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Kanban, Loader2 } from 'lucide-react';
import { KanbanPipelineBoard } from '@/components/ats/KanbanPipelineBoard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { atsService } from '@/services/ats.service';

export default function RecruiterPipelinePage() {
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['recruiter-pipeline'],
    queryFn: () => atsService.getRecruiterPipeline(),
    enabled: user?.role === 'RECRUITER',
  });

  const applications = data?.applications ?? [];

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="pipeline"
      pageTitle="Candidate ATS Pipeline"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          All Active Applicants ({applications.length})
        </h2>
        <p className="text-sm text-slate-500">
          Manage candidates across all your published and active requisitions, sorted by advisory match score.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Loading ATS pipeline...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load pipeline.'}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="No candidate applications yet"
          description="Once candidates apply to your published jobs, they will appear across your Kanban stages here."
        />
      ) : (
        <KanbanPipelineBoard applications={applications} showJobTitle />
      )}
    </DashboardShell>
  );
}

