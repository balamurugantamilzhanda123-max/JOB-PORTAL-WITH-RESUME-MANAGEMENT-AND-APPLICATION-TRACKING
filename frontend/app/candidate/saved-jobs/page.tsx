'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bookmark,
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useJobStream } from '@/hooks/useJobStream';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import {
  formatDate,
  formatEmploymentType,
  formatSalaryRange,
  formatWorkMode,
} from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { jobsService } from '@/services/jobs.service';
import { Job } from '@/types';

export default function CandidateSavedJobsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useJobStream(user?.role === 'CANDIDATE');

  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['candidate-bookmarks'],
    queryFn: () => jobsService.listSavedJobs(),
    enabled: user?.role === 'CANDIDATE',
  });

  const removeMutation = useMutation({
    mutationFn: (jobId: string) => jobsService.removeBookmark(jobId),
    onSuccess: () => {
      toast.success('Removed from Saved Jobs');
      void queryClient.invalidateQueries({ queryKey: ['candidate-bookmarks'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Unable to remove bookmark');
    },
  });

  const bookmarks = data?.bookmarks ?? [];

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="saved-jobs"
      pageTitle="Saved Jobs"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Bookmarked Opportunities ({bookmarks.length})
          </h2>
          <p className="text-sm text-slate-500">
            Your saved roles persist across sessions. If a hiring team pauses or closes a role, its status updates here automatically.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/candidate/jobs">
            <Search className="h-4 w-4" />
            Explore More Jobs
          </Link>
        </Button>
      </div>

      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Failed to load saved jobs.'}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Loading your saved jobs...
        </div>
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs yet"
          description="Bookmark openings in the Explore Jobs workspace to keep track of roles you want to revisit."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookmarks.map((item) => {
            const { job, isUnavailable, savedAt } = item;
            return (
              <Card
                key={item.bookmarkId}
                className={isUnavailable ? 'border-amber-200 bg-amber-50/20' : ''}
              >
                <CardContent className="space-y-3.5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {job.company}
                      </p>
                    </div>
                    {isUnavailable && (
                      <Badge variant="amber" className="shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        {job.status === 'PAUSED' ? 'Paused' : 'Closed'}
                      </Badge>
                    )}
                  </div>

                  {isUnavailable && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This job posting is currently <strong>{job.status.toLowerCase()}</strong> and unavailable in active search. Your bookmark is preserved.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
                    <Badge variant="default">{formatEmploymentType(job.employmentType)}</Badge>
                    <Badge variant="muted">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {formatSalaryRange({
                        salaryMin: job.salaryMin,
                        salaryMax: job.salaryMax,
                        salaryCurrency: job.salaryCurrency,
                        salaryUndisclosed: job.salaryUndisclosed,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Saved {formatDate(savedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUnavailable}
                      onClick={() => setInspectingJob(job)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isUnavailable ? 'Unavailable' : 'View Details'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(job.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal for opening a saved published job */}
      <Dialog open={Boolean(inspectingJob)} onOpenChange={() => setInspectingJob(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Saved Job Details</DialogTitle>
          </DialogHeader>
          {inspectingJob && (
            <JobPreviewCard
              job={inspectingJob}
              onToggleBookmark={() => {
                removeMutation.mutate(inspectingJob.id);
                setInspectingJob(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

