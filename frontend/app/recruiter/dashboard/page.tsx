'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Kanban,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { AccountProfilePanel } from '@/components/dashboard/AccountProfilePanel';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { ApiClientError } from '@/services/api';
import { dashboardService } from '@/services/dashboard.service';
import { RecruiterDashboardData } from '@/types';

const VIEW_TITLES: Record<string, string> = {
  overview: 'Recruiter Overview',
  profile: 'Company & Recruiter Profile',
  settings: 'Workspace Settings',
};

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [data, setData] = useState<RecruiterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && ['overview', 'profile', 'settings'].includes(view)) {
      setActiveView(view);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardService.getRecruiterDashboard();
      setData(response);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load recruiter workspace data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'RECRUITER') {
      void loadDashboard();
    }
  }, [user?.role, loadDashboard]);

  const activeUser = data?.user || user;

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView={activeView}
      onSelectView={setActiveView}
      pageTitle={VIEW_TITLES[activeView] || 'Recruiter Dashboard'}
    >
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadDashboard()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : activeUser ? (
        <>
          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-700 to-emerald-700 p-6 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <Badge className="border-white/20 bg-white/15 text-white">
                      Recruiter &amp; Hiring Manager Portal
                    </Badge>
                    <h2 className="mt-2.5 text-2xl font-semibold tracking-tight">
                      Welcome, {activeUser.fullName}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-teal-100">
                      Publish job openings, review match-scored applicants on the Kanban board, schedule interviews, and track conversion analytics.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="bg-white text-teal-800 hover:bg-teal-50"
                    >
                      <Link href="/recruiter/jobs/create">
                        <Plus className="h-4 w-4" />
                        Create New Job
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <Link href="/recruiter/pipeline">
                        ATS Pipeline
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Published Jobs"
                  value={data?.summary.activeJobsCount ?? 0}
                  subtext={`${data?.summary.totalJobsCount ?? 0} total requisitions`}
                  icon={Briefcase}
                  accentClass="bg-teal-50 text-teal-600"
                />
                <StatCard
                  label="Total Applicants"
                  value={data?.summary.totalApplicantsCount ?? 0}
                  subtext="Candidates in ATS pipeline"
                  icon={Users}
                  accentClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                  label="Interviews"
                  value={data?.summary.scheduledInterviewsCount ?? 0}
                  subtext={`${data?.summary.unreadNotificationsCount ?? 0} unread alert(s)`}
                  icon={CalendarClock}
                  accentClass="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                  label="Workspace Status"
                  value={data?.summary.accountStatus ?? 'Active'}
                  subtext="Recruiter RBAC verified"
                  icon={CheckCircle2}
                  accentClass="bg-emerald-50 text-emerald-600"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <AccountProfilePanel
                    user={activeUser}
                    workspaceLabel="Recruiter Account Information"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recruiting Operations</CardTitle>
                    <CardDescription>Jump to active ATS tools</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link
                      href="/recruiter/jobs"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3 transition-colors hover:bg-teal-50"
                    >
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Job Management Console
                          </p>
                          <p className="text-xs text-slate-600">
                            Create, edit, publish, pause, and close postings.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-teal-600" />
                    </Link>

                    <Link
                      href="/recruiter/pipeline"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-start gap-2.5">
                        <Kanban className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Candidate Kanban Pipeline
                          </p>
                          <p className="text-xs text-slate-600">
                            Inspect resumes, move stages, and submit scorecards.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </Link>

                    <Link
                      href="/recruiter/analytics"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-start gap-2.5">
                        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Hiring Funnel Analytics
                          </p>
                          <p className="text-xs text-slate-600">
                            Conversion rates, stage breakdown, and average match score.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {(data?.summary.totalApplicantsCount ?? 0) === 0 && (
                <EmptyState
                  icon={Kanban}
                  title="Publish a role to start receiving applicants"
                  description="Once candidates apply to your published jobs, they will appear in your match-scored Kanban ATS pipeline."
                />
              )}
            </div>
          )}

          {activeView === 'profile' && (
            <AccountProfilePanel
              user={activeUser}
              workspaceLabel="Company & Recruiter Identity"
            />
          )}

          {activeView === 'settings' && <SettingsPanel user={activeUser} />}
        </>
      ) : null}
    </DashboardShell>
  );
}
