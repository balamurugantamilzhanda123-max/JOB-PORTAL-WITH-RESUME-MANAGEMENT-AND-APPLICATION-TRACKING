'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
  cn,
  formatDate,
  formatEmploymentType,
  formatSalaryRange,
  formatWorkMode,
  getDashboardRouteForRole,
} from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { WorkMode } from '@/types';

export default function PublicJobsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode | ''>('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q') || '';
    setSearchInput(q);
    setDebouncedQ(q);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['public-jobs', { debouncedQ, workMode }],
    queryFn: () =>
      atsService.searchPublicJobs({
        q: debouncedQ || undefined,
        workMode: workMode ? [workMode] : undefined,
        sort: 'newest',
        limit: 25,
      }),
  });

  useEffect(() => {
    if (data?.items.length && (!selectedJobId || !data.items.some((j) => j.id === selectedJobId))) {
      setSelectedJobId(data.items[0].id);
    }
  }, [data?.items, selectedJobId]);

  const selectedJob = useMemo(
    () => data?.items.find((j) => j.id === selectedJobId) || null,
    [data?.items, selectedJobId],
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-slate-900">TalentForge Jobs</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="primary" size="sm">
                <Link href={user.role === 'CANDIDATE' ? '/candidate/jobs' : getDashboardRouteForRole(user.role)}>
                  Open Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link href="/register">Create account to Apply</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search published jobs by title, skill, company, or location..."
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedQ('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['', 'REMOTE', 'HYBRID', 'ONSITE'] as const).map((wm) => (
                <Button
                  key={wm || 'ALL'}
                  type="button"
                  size="sm"
                  variant={workMode === wm ? 'default' : 'outline'}
                  onClick={() => setWorkMode(wm)}
                >
                  {wm === '' ? 'All Modes' : formatWorkMode(wm)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Loading published openings...
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">No published openings found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try clearing your search filter or sign in as a Recruiter to publish a new role.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className={cn('space-y-3 lg:col-span-5', mobileDetail ? 'hidden lg:block' : 'block')}>
              <p className="px-1 text-xs font-medium text-slate-500">
                {data.pagination.total} published job(s)
              </p>
              {data.items.map((job) => (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setMobileDetail(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedJobId(job.id);
                      setMobileDetail(true);
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-xl border bg-white p-4 transition-all hover:border-blue-300',
                    job.id === selectedJob?.id
                      ? 'border-blue-600 ring-1 ring-blue-600 shadow-sm'
                      : 'border-slate-200',
                  )}
                >
                  <h2 className="text-sm font-semibold text-slate-900">{job.title}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {job.company}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
                    <Badge variant="default">{formatEmploymentType(job.employmentType)}</Badge>
                    <Badge variant="muted">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {formatSalaryRange({
                        salaryMin: job.salaryMin,
                        salaryMax: job.salaryMax,
                        salaryCurrency: job.salaryCurrency,
                        salaryUndisclosed: job.salaryUndisclosed,
                      })}
                    </span>
                    {job.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(job.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={cn('lg:col-span-7', mobileDetail ? 'block' : 'hidden lg:block')}>
              {selectedJob && (
                <Card className="lg:sticky lg:top-6">
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="lg:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileDetail(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to list
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-blue-900">
                      <span>Sign in as a Candidate to bookmark, run an ATS resume match check, and apply in one click.</span>
                      <Button asChild size="sm" variant="primary">
                        <Link href={user?.role === 'CANDIDATE' ? '/candidate/jobs' : '/login'}>
                          {user?.role === 'CANDIDATE' ? 'Apply in Workspace' : 'Sign in to Apply'}
                        </Link>
                      </Button>
                    </div>

                    <JobPreviewCard job={selectedJob} showPhase4ApplyNotice={false} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

