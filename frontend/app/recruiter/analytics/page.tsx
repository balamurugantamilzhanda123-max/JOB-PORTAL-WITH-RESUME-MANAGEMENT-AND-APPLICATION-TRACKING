'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { atsService } from '@/services/ats.service';

export default function RecruiterAnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['recruiter-analytics'],
    queryFn: () => atsService.getFunnelAnalytics(),
    enabled: user?.role === 'RECRUITER',
  });

  const stages = data
    ? [
        { label: 'Applied', count: data.stageBreakdown.APPLIED },
        { label: 'Screening', count: data.stageBreakdown.SCREENING },
        { label: 'Shortlisted', count: data.stageBreakdown.SHORTLISTED },
        { label: 'Interview', count: data.stageBreakdown.INTERVIEW },
        { label: 'Offer', count: data.stageBreakdown.OFFER },
        { label: 'Hired', count: data.stageBreakdown.HIRED },
        { label: 'Rejected', count: data.stageBreakdown.REJECTED },
      ]
    : [];

  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="analytics"
      pageTitle="Hiring Funnel Analytics"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Computing PostgreSQL funnel metrics...
        </div>
      ) : isError || !data ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load analytics.'}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Jobs"
              value={data.totals.totalJobs}
              subtext={`${data.totals.publishedJobs} published • ${data.totals.pausedJobs} paused`}
              icon={Briefcase}
              accentClass="bg-teal-50 text-teal-600"
            />
            <StatCard
              label="Total Applications"
              value={data.totals.totalApplications}
              subtext="Distinct candidates across jobs"
              icon={Users}
              accentClass="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Average Match Score"
              value={
                data.totals.averageMatchScore != null
                  ? `${data.totals.averageMatchScore}%`
                  : 'N/A'
              }
              subtext="Across scored applicants"
              icon={Sparkles}
              accentClass="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Scheduled Interviews"
              value={data.totals.interviewsCount}
              subtext={`${data.conversions.appliedToOfferPct}% offer conversion`}
              icon={CalendarClock}
              accentClass="bg-emerald-50 text-emerald-600"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                  Pipeline Stage Breakdown
                </CardTitle>
                <CardDescription>
                  Derived directly from PostgreSQL application records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stages.map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{s.label}</span>
                      <span className="font-mono font-semibold">{s.count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all"
                        style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Conversion Rates &amp; Job Breakdown
                </CardTitle>
                <CardDescription>
                  Cohort conversions across active requisitions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Applied → Screened+</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                      {data.conversions.appliedToScreeningPct}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Applied → Interview+</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                      {data.conversions.appliedToInterviewPct}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Applied → Offer/Hired</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-emerald-700">
                      {data.conversions.appliedToOfferPct}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Rejection Rate</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-red-600">
                      {data.conversions.rejectionRatePct}%
                    </p>
                  </div>
                </div>

                {data.topJobs.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Applicants by Requisition
                    </p>
                    {data.topJobs.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                      >
                        <Link
                          href={`/recruiter/jobs/${j.id}/ats`}
                          className="truncate font-medium text-slate-900 hover:text-teal-700"
                        >
                          {j.title}
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="default">{j.status}</Badge>
                          <span className="font-mono font-semibold text-slate-700">
                            {j.applicantsCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

