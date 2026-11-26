'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { cn, formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';
import { ApplicationStage } from '@/types';

const STAGE_STEPS: ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
];

function getStageBadgeVariant(stage: ApplicationStage): 'emerald' | 'amber' | 'red' | 'blue' | 'default' {
  switch (stage) {
    case 'HIRED':
    case 'OFFER':
      return 'emerald';
    case 'INTERVIEW':
    case 'SHORTLISTED':
      return 'blue';
    case 'SCREENING':
      return 'amber';
    case 'REJECTED':
    case 'WITHDRAWN':
      return 'red';
    default:
      return 'default';
  }
}

export default function CandidateApplicationsPage() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: () => atsService.listMyApplications(),
    enabled: user?.role === 'CANDIDATE',
  });

  const applications = data?.applications ?? [];

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="applications"
      pageTitle="My Applications"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Live Application Tracker ({applications.length})
          </h2>
          <p className="text-sm text-slate-500">
            Updates automatically via Server-Sent Events as recruiters review your application and schedule interviews.
          </p>
        </div>
        <Button asChild variant="primary" size="sm">
          <Link href="/candidate/jobs">
            <Search className="h-4 w-4" />
            Explore More Jobs
          </Link>
        </Button>
      </div>

      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load applications.'}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
          Loading your applications...
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No applications submitted yet"
          description="Upload a resume in your Resume Vault, then click Quick Apply on any published opening in Explore Jobs."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const currentIndex = STAGE_STEPS.indexOf(app.stage);
            const isRejected = app.stage === 'REJECTED' || app.stage === 'WITHDRAWN';
            const expanded = expandedId === app.id;

            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <CardTitle>{app.job?.title || 'Job Opening'}</CardTitle>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {app.job?.company}
                        </span>
                        <span>•</span>
                        <span>Applied {formatDate(app.appliedAt)}</span>
                        {app.resumeSnapshot && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              Snapshot: {app.resumeSnapshot.title} (v{app.resumeSnapshot.version})
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {app.matchScore != null && (
                        <Badge variant="blue" className="font-mono">
                          <Sparkles className="h-3 w-3" />
                          Match {app.matchScore}%
                        </Badge>
                      )}
                      <Badge variant={getStageBadgeVariant(app.stage)}>{app.stage}</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Visual Stage Stepper */}
                  {!isRejected ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {STAGE_STEPS.map((step, idx) => {
                        const completed = currentIndex >= idx;
                        return (
                          <div
                            key={step}
                            className={cn(
                              'rounded-lg border px-2.5 py-2 text-center text-[11px] font-semibold transition-colors',
                              completed
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-400',
                            )}
                          >
                            {step}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                      Status: {app.stage} — Thank you for applying.
                    </div>
                  )}

                  {/* Upcoming Interviews */}
                  {app.interviews && app.interviews.length > 0 && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-indigo-950">
                        <CalendarClock className="h-4 w-4 text-indigo-600" />
                        Scheduled Interview ({app.interviews[0].roundTitle})
                      </p>
                      <p className="mt-1 text-indigo-800">
                        {new Date(app.interviews[0].startAt).toLocaleString()} ({app.interviews[0].timezone}) • Status:{' '}
                        <strong>{app.interviews[0].status}</strong>
                      </p>
                      <Link
                        href="/candidate/interviews"
                        className="mt-1.5 inline-block font-semibold text-blue-700 hover:underline"
                      >
                        Manage Interview Response →
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expanded ? null : app.id)}
                    >
                      {expanded ? 'Hide Timeline & Match Details' : 'View Timeline & Match Details'}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
                      {/* Event Timeline */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status History
                        </h4>
                        <div className="space-y-2">
                          {(app.events || []).map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                            >
                              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {ev.fromStage ? `${ev.fromStage} → ${ev.toStage}` : ev.toStage}
                                </p>
                                {ev.publicNote && (
                                  <p className="text-slate-600">{ev.publicNote}</p>
                                )}
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {new Date(ev.occurredAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explainable Match Evidence */}
                      {app.scoreBreakdown && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Advisory Match Evidence (v{app.scoreBreakdown.scoringVersion})
                          </h4>
                          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
                            <p className="text-slate-700">
                              Required Skills:{' '}
                              <strong>
                                {app.scoreBreakdown.requiredSkillCoverage.score}/
                                {app.scoreBreakdown.requiredSkillCoverage.maxScore}
                              </strong>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {app.scoreBreakdown.requiredSkillCoverage.matchedSkills.map((s) => (
                                <Badge key={s} variant="emerald">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {s}
                                </Badge>
                              ))}
                              {app.scoreBreakdown.requiredSkillCoverage.missingSkills.map((s) => (
                                <Badge key={s} variant="amber">
                                  Gap: {s}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-slate-600">
                              Experience: {app.scoreBreakdown.experienceAlignment.status}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

