'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit3, Kanban, Loader2, Pause, Play, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { jobsService } from '@/services/jobs.service';
import { JobStatus } from '@/types';

export default function RecruiterJobDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const jobId = params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['recruiter-job-detail', jobId],
    queryFn: () => jobsService.getRecruiterJob(jobId),
    enabled: Boolean(jobId) && user?.role === 'RECRUITER',
  });

  const statusMutation = useMutation({
    mutationFn: (status: JobStatus) => jobsService.transitionJobStatus(jobId, status),
    onSuccess: (res) => {
      toast.success(`Job status updated to ${res.job.status}`);
      void queryClient.invalidateQueries({ queryKey: ['recruiter-job-detail', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to update status'),
  });

  const job = data?.job;

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="jobs"
      pageTitle="Job Requisition Overview"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/recruiter/jobs">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Console
          </Link>
        </Button>

        {job && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={job.status === 'PUBLISHED' ? 'emerald' : 'muted'}>{job.status}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/recruiter/jobs/${job.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                Edit Job
              </Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href={`/recruiter/jobs/${job.id}/applicants`}>
                <Kanban className="h-4 w-4" />
                View Applicants Pipeline
              </Link>
            </Button>
            {job.status !== 'PUBLISHED' && job.status !== 'CLOSED' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('PUBLISHED')}
              >
                <Play className="h-4 w-4" />
                Publish
              </Button>
            )}
            {job.status === 'PUBLISHED' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('PAUSED')}
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {job.status !== 'CLOSED' && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('CLOSED')}
              >
                <XCircle className="h-4 w-4" />
                Close
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Loading job details...
        </div>
      ) : isError || !job ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error instanceof Error ? error.message : 'Job not found or access denied.'}
          </CardContent>
        </Card>
      ) : (
        <JobPreviewCard job={job} />
      )}
    </DashboardShell>
  );
}
