'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  Search,
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
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { ApiClientError } from '@/services/api';
import { dashboardService } from '@/services/dashboard.service';
import { CandidateDashboardData } from '@/types';

const VIEW_TITLES: Record<string, string> = {
  overview: 'Candidate Overview',
  profile: 'My Profile',
  settings: 'Account Settings',
};

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [data, setData] = useState<CandidateDashboardData | null>(null);
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
      const response = await dashboardService.getCandidateDashboard();
      setData(response);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load candidate workspace data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'CANDIDATE') {
      void loadDashboard();
    }
  }, [user?.role, loadDashboard]);

  const activeUser = data?.user || user;

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView={activeView}
      onSelectView={setActiveView}
      pageTitle={VIEW_TITLES[activeView] || 'Candidate Dashboard'}
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
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <Badge className="border-white/20 bg-white/15 text-white">
                      Candidate Career Workspace
                    </Badge>
                    <h2 className="mt-2.5 text-2xl font-semibold tracking-tight">
                      Welcome, {activeUser.fullName}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-blue-100">
                      Search live jobs, upload PDF/DOCX resumes to check ATS keyword alignment, submit one-click applications, and track your interview schedule.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      <Link href="/candidate/jobs">
                        <Search className="h-4 w-4" />
                        Explore Jobs
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <Link href="/candidate/resumes">
                        <FileText className="h-4 w-4" />
                        Resume Vault
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Published Jobs"
                  value={data?.summary.publishedJobsCount ?? 0}
                  subtext="Live openings available"
                  icon={Search}
                  accentClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                  label="Resume Vault"
                  value={data?.summary.resumeCount ?? 0}
                  subtext={`${data?.summary.profileCompletionPercent ?? 75}% profile strength`}
                  icon={FileText}
                  accentClass="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                  label="My Applications"
                  value={data?.summary.applicationCount ?? 0}
                  subtext={`${data?.summary.bookmarkedJobsCount ?? 0} saved job(s)`}
                  icon={ClipboardList}
                  accentClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                  label="Upcoming Interviews"
                  value={data?.summary.upcomingInterviewsCount ?? 0}
                  subtext={`${data?.summary.unreadNotificationsCount ?? 0} unread alert(s)`}
                  icon={CalendarClock}
                  accentClass="bg-amber-50 text-amber-600"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <AccountProfilePanel
                    user={activeUser}
                    workspaceLabel="Candidate Account Information"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Complete your job search workflow</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link
                      href="/candidate/resumes"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 p-3 transition-colors hover:bg-blue-50"
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Manage Resume Vault
                          </p>
                          <p className="text-xs text-slate-600">
                            Upload PDF/DOCX versions and run ATS keyword gap checks.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
                    </Link>

                    <Link
                      href="/candidate/applications"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Track Applications
                          </p>
                          <p className="text-xs text-slate-600">
                            Live stage progression, match evidence, and interview alerts.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </Link>

                    <Link
                      href="/candidate/saved-jobs"
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-start gap-2.5">
                        <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Saved Jobs</p>
                          <p className="text-xs text-slate-600">
                            Review bookmarked roles and apply directly.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {(data?.summary.applicationCount ?? 0) === 0 && (
                <EmptyState
                  icon={ClipboardList}
                  title="Ready to submit your first application"
                  description="Upload a resume in Resume Vault, explore published openings, and click Quick Apply to start tracking live recruiter updates."
                />
              )}
            </div>
          )}

          {activeView === 'profile' && (
            <AccountProfilePanel
              user={activeUser}
              workspaceLabel="Candidate Identity & Profile"
            />
          )}

          {activeView === 'settings' && <SettingsPanel user={activeUser} />}
        </>
      ) : null}
    </DashboardShell>
  );
}
