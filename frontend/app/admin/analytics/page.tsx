'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Briefcase, Clock, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { ApplicationStage } from '@/types';

const STAGES: ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
];

export default function AdminAnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-funnel-analytics'],
    queryFn: () => atsService.getFunnelAnalytics(),
    enabled: user?.role === 'ADMIN',
  });

  return (
    <DashboardShell
      requiredRole="ADMIN"
      navItems={ADMIN_NAV_ITEMS}
      activeView="analytics"
      pageTitle="Platform Hiring Funnel Analytics"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          Metrics reconciled directly from PostgreSQL <code>applications</code>,{' '}
          <code>application_events</code>, and <code>jobs</code>.{' '}
          {data?.generatedAt && `Refreshed ${formatDate(data.generatedAt)}`}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-600" />
          Computing platform metrics...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Jobs"
              value={data.totals.totalJobs}
              subtext={`${data.totals.publishedJobs} published • ${data.totals.closedJobs} closed`}
              icon={Briefcase}
              accentClass="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Total Applications"
              value={data.totals.totalApplications}
              subtext={`${data.conversions.appliedToScreeningPct}% progressed past Applied`}
              icon={BarChart3}
              accentClass="bg-teal-50 text-teal-600"
            />
            <StatCard
              label="Avg Time to Offer / Hire"
              value={
                data.totals.timeToHireDaysAvg != null
                  ? `${data.totals.timeToHireDaysAvg}d`
                  : 'N/A'
              }
              subtext="Measured from application date to offer/hire update"
              icon={Clock}
              accentClass="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Job Fill Rate"
              value={`${data.totals.jobFillRatePct ?? 0}%`}
              subtext={`Avg match score: ${data.totals.averageMatchScore ?? 'N/A'}%`}
              icon={TrendingUp}
              accentClass="bg-violet-50 text-violet-600"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage Conversion Funnel</CardTitle>
                <CardDescription>
                  Distinct application counts and conversion rates across all jobs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {STAGES.map((stage) => {
                  const count = data.stageBreakdown[stage] || 0;
                  const pct =
                    data.totals.totalApplications > 0
                      ? Math.round((count / data.totals.totalApplications) * 100)
                      : 0;
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{stage}</span>
                        <span className="text-slate-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Active Requisitions</CardTitle>
                <CardDescription>Most recent jobs ordered by application volume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.topJobs.length === 0 ? (
                  <p className="text-xs text-slate-500">No job requisitions recorded yet.</p>
                ) : (
                  data.topJobs.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{j.title}</p>
                        <p className="text-xs text-slate-500">{j.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="muted">{j.status}</Badge>
                        <Badge variant="blue">{j.applicantsCount} applicants</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
