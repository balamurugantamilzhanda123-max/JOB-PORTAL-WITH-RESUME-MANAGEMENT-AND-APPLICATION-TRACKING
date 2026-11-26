'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Edit3,
  FileEdit,
  Kanban,
  Loader2,
  PauseCircle,
  Plus,
  Rocket,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import {
  formatDate,
  formatEmploymentType,
  formatWorkMode,
  getJobStatusBadgeVariant,
} from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { jobsService } from '@/services/jobs.service';
import { Job, JobStatus, WorkMode } from '@/types';

export default function RecruiterJobsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [workModeFilter, setWorkModeFilter] = useState<WorkMode | ''>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const [confirmAction, setConfirmAction] = useState<{
    job: Job;
    targetStatus: 'PAUSED' | 'CLOSED';
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'recruiter-jobs',
      { debouncedSearch, statusFilter, workModeFilter, locationFilter, sort, page },
    ],
    queryFn: () =>
      jobsService.listRecruiterJobs({
        q: debouncedSearch || undefined,
        status: statusFilter,
        workMode: workModeFilter,
        location: locationFilter || undefined,
        sort,
        page,
        limit: 10,
      }),
    enabled: user?.role === 'RECRUITER',
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      jobsService.transitionJobStatus(id, status),
    onSuccess: (_res, vars) => {
      toast.success(`Job status updated to ${vars.status}`);
      setConfirmAction(null);
      void queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiClientError ? err.message : 'Unable to update job status.',
      );
    },
  });

  const stats = data?.stats;

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="jobs"
      pageTitle="Job Management Console"
    >
      {/* Top header + Primary CTA */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Requisitions &amp; Job Openings
          </h2>
          <p className="text-sm text-slate-500">
            Create, edit, publish, pause, and manage lifecycle visibility across all your postings.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/recruiter/jobs/create">
            <Plus className="h-4 w-4" />
            + Create New Job
          </Link>
        </Button>
      </div>

      {/* Real PostgreSQL Job Status Counts */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Jobs"
          value={stats?.totalJobs ?? 0}
          subtext="All requisitions"
          icon={Briefcase}
          accentClass="bg-slate-100 text-slate-700"
        />
        <StatCard
          label="Published Jobs"
          value={stats?.publishedJobs ?? 0}
          subtext="Live to candidates"
          icon={CheckCircle2}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Draft Jobs"
          value={stats?.draftJobs ?? 0}
          subtext="In preparation"
          icon={FileEdit}
          accentClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Paused Jobs"
          value={stats?.pausedJobs ?? 0}
          subtext="Temporarily hidden"
          icon={PauseCircle}
          accentClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Closed Jobs"
          value={stats?.closedJobs ?? 0}
          subtext="Archived openings"
          icon={XCircle}
          accentClass="bg-red-50 text-red-600"
        />
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by job title, company, or department..."
                className="pl-9"
                aria-label="Search recruiter jobs"
              />
            </div>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as JobStatus | '');
                setPage(1);
              }}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="PAUSED">Paused</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              aria-label="Filter by work mode"
              value={workModeFilter}
              onChange={(e) => {
                setWorkModeFilter(e.target.value as WorkMode | '');
                setPage(1);
              }}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="">All Work Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">Onsite</option>
            </select>

            <div className="flex gap-2">
              <Input
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Location..."
                aria-label="Filter by location"
              />
              <select
                aria-label="Sort jobs"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'newest' | 'oldest');
                  setPage(1);
                }}
                className="flex h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-700">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error instanceof Error ? error.message : 'Failed to load job listings.'}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Loading your job postings...
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Briefcase}
                title="No job postings match your criteria"
                description="Create your first job requisition to draft requirements, configure screening questions, and publish directly to candidates."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-semibold">Job Title</th>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-4 py-3 font-semibold">Work Mode</th>
                      <th className="px-4 py-3 font-semibold">Employment Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/recruiter/jobs/${job.id}/edit`}
                            className="font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs text-slate-500">{job.department}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{job.company}</td>
                        <td className="px-4 py-3.5 text-slate-600">{job.location}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {formatEmploymentType(job.employmentType)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={getJobStatusBadgeVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(job.updatedAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/recruiter/jobs/${job.id}/ats`}>
                                <Kanban className="h-3.5 w-3.5" />
                                ATS Pipeline
                              </Link>
                            </Button>

                            <Button asChild variant="outline" size="sm">
                              <Link href={`/recruiter/jobs/${job.id}/edit`}>
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </Link>
                            </Button>

                            {(job.status === 'DRAFT' || job.status === 'PAUSED') && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({ id: job.id, status: 'PUBLISHED' })
                                }
                              >
                                <Rocket className="h-3.5 w-3.5" />
                                Publish
                              </Button>
                            )}

                            {job.status === 'PUBLISHED' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({ job, targetStatus: 'PAUSED' })
                                }
                              >
                                Pause
                              </Button>
                            )}

                            {job.status !== 'CLOSED' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() =>
                                  setConfirmAction({ job, targetStatus: 'CLOSED' })
                                }
                              >
                                Close
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                  <span>
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} jobs)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Pause / Close */}
      <Dialog open={Boolean(confirmAction)} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.targetStatus === 'PAUSED'
                ? 'Pause Job Posting?'
                : 'Close Job Posting?'}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-slate-600">
              {confirmAction?.targetStatus === 'PAUSED'
                ? `"${confirmAction.job.title}" will be hidden from active candidate search while preserving existing candidate bookmarks. You can republish it later.`
                : `"${confirmAction?.job.title}" will be permanently closed and removed from active discovery. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction?.targetStatus === 'CLOSED' ? 'destructive' : 'default'}
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirmAction) {
                  statusMutation.mutate({
                    id: confirmAction.job.id,
                    status: confirmAction.targetStatus,
                  });
                }
              }}
            >
              {statusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

