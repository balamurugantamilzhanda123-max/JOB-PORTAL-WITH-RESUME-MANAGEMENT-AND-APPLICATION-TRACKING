'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Star,
  Target,
  UserCheck,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { formatDate, formatStageLabel } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function RecruiterCandidateApplicationPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const applicationId = params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['recruiter-application-detail', applicationId],
    queryFn: () => atsService.getRecruiterApplicationDetail(applicationId),
    enabled: Boolean(applicationId) && user?.role === 'RECRUITER',
  });

  const app = data?.application;

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="pipeline"
      pageTitle="Applicant Profile & Snapshot"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/recruiter/pipeline">
            <ArrowLeft className="h-4 w-4" />
            Back to ATS Pipeline
          </Link>
        </Button>

        {app && (
          <div className="flex items-center gap-2">
            {app.resumeId && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={atsService.getResumeDownloadUrl(app.resumeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  Download Resume File
                </a>
              </Button>
            )}
            <Button asChild variant="primary" size="sm">
              <Link href={`/recruiter/evaluations/${app.id}`}>
                <Star className="h-4 w-4" />
                Open Evaluation Scorecard
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
          Loading applicant dossier...
        </div>
      ) : isError || !app ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error instanceof Error ? error.message : 'Application not found or access denied.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-teal-600" />
                      {app.candidate?.fullName || 'Candidate'}
                    </CardTitle>
                    <CardDescription>
                      {app.candidate?.email} • Role: {app.job?.title} ({app.job?.company})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="blue">{formatStageLabel(app.stage)}</Badge>
                    {app.matchScore != null && (
                      <Badge variant="emerald">Advisory Match: {app.matchScore}%</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.coverNote && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Candidate Cover Note
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                      {app.coverNote}
                    </p>
                  </div>
                )}

                {(app.screeningAnswers ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">Screening Responses</h3>
                    {app.screeningAnswers!.map((ans, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-medium text-slate-900">{ans.questionTitle}</p>
                        <p className="mt-1 text-slate-600">
                          {Array.isArray(ans.answer) ? ans.answer.join(', ') : String(ans.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Audit Timeline &amp; Internal Stage Notes
                  </h3>
                  <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
                    {(app.events ?? []).map((ev) => (
                      <div key={ev.id} className="relative space-y-1">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-600" />
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-slate-900">
                            {formatStageLabel(ev.toStage)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(ev.occurredAt)}
                            {ev.actor ? ` • by ${ev.actor.fullName}` : ''}
                          </span>
                        </div>
                        {ev.publicNote && (
                          <p className="text-xs text-slate-600">Candidate note: {ev.publicNote}</p>
                        )}
                        {ev.internalNote && (
                          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                            Internal note (private): {ev.internalNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-teal-600" />
                  Interviews &amp; Submitted Scorecards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(app.interviews ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">No interviews proposed yet.</p>
                ) : (
                  app.interviews!.map((iv) => (
                    <div key={iv.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{iv.roundTitle}</span>
                        <Badge variant="blue">{iv.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(iv.startAt).toLocaleString()} ({iv.timezone}) • Candidate response:{' '}
                        {iv.candidateResponse}
                      </p>
                    </div>
                  ))
                )}

                {(app.evaluations ?? []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Team Evaluations
                    </p>
                    {app.evaluations!.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            {ev.reviewer?.fullName || 'Reviewer'} — Rating: {ev.rating}/5
                          </span>
                          {ev.recommendation && <Badge variant="blue">{ev.recommendation}</Badge>}
                        </div>
                        {ev.notes && <p className="mt-1 text-xs text-slate-600">{ev.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-slate-600" />
                  Immutable Resume Snapshot
                </CardTitle>
                <CardDescription>Snapshot captured at submission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app.resumeSnapshot && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{app.resumeSnapshot.title}</span>
                      <Badge variant="muted">v{app.resumeSnapshot.version}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Captured {formatDate(app.resumeSnapshot.capturedAt)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.resumeSnapshot.skills.map((skill) => (
                        <Badge key={skill} variant="blue">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {app.scoreBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-teal-600" />
                    Explainable Match Breakdown
                  </CardTitle>
                  <CardDescription>
                    Advisory scoring v{app.scoreBreakdown.scoringVersion} (human review required)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Matched skills ({app.scoreBreakdown.requiredSkillCoverage.matchedSkills.length}):{' '}
                    {app.scoreBreakdown.requiredSkillCoverage.matchedSkills.join(', ') || 'None'}
                  </div>
                  <p className="text-slate-600">
                    Not detected:{' '}
                    {app.scoreBreakdown.requiredSkillCoverage.missingSkills.join(', ') || 'None'}
                  </p>
                  <p className="text-slate-500">
                    Experience status: {app.scoreBreakdown.experienceAlignment.status} (
                    {app.scoreBreakdown.experienceAlignment.score}/
                    {app.scoreBreakdown.experienceAlignment.maxScore})
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
