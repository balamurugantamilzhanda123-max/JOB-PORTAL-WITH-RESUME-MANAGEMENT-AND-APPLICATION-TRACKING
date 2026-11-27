'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Video,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { formatDate, formatStageLabel } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function CandidateApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const applicationId = params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['candidate-application-detail', applicationId],
    queryFn: () => atsService.getMyApplicationDetail(applicationId),
    enabled: Boolean(applicationId) && user?.role === 'CANDIDATE',
  });

  const app = data?.application;

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="applications"
      pageTitle="Application Detail & Timeline"
    >
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href="/candidate/applications">
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
          Loading application timeline...
        </div>
      ) : isError || !app ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error instanceof Error ? error.message : 'Application not found'}
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
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                      {app.job?.title || 'Application'}
                    </CardTitle>
                    <CardDescription>
                      {app.job?.company} • Applied {formatDate(app.appliedAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="blue">{formatStageLabel(app.stage)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Stage History &amp; Candidate-Visible Updates
                  </h3>
                  <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
                    {(app.events ?? []).map((ev) => (
                      <div key={ev.id} className="relative space-y-1">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatStageLabel(ev.toStage)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(ev.occurredAt)}
                          </span>
                        </div>
                        {ev.publicNote && (
                          <p className="text-sm text-slate-600">{ev.publicNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {app.coverNote && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Submitted Cover Note
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
              </CardContent>
            </Card>

            {(app.interviews ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    Scheduled Interviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {app.interviews!.map((iv) => (
                    <div
                      key={iv.id}
                      className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{iv.roundTitle}</span>
                          <Badge variant="blue">{iv.status}</Badge>
                          <Badge variant="muted">{iv.candidateResponse}</Badge>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(iv.startAt).toLocaleString()} ({iv.timezone})
                        </p>
                        {iv.instructions && (
                          <p className="text-xs text-slate-600">{iv.instructions}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {iv.meetingUrl && (
                          <Button asChild size="sm" variant="outline">
                            <a href={iv.meetingUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="h-3.5 w-3.5" />
                              Meeting Link
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="primary">
                          <Link href="/candidate/interviews">Manage Response</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-slate-600" />
                  Immutable Resume Snapshot
                </CardTitle>
                <CardDescription>
                  Locked at submission so later vault edits never alter your submitted record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app.resumeSnapshot ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {app.resumeSnapshot.title}
                      </span>
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
                    {app.resumeId && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/candidate/resumes/${app.resumeId}`}>View Vault Resume</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No snapshot details available.</p>
                )}
              </CardContent>
            </Card>

            {(app.evaluations ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Shared Candidate Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {app.evaluations!.map((ev) => (
                    <div key={ev.id} className="rounded-lg border border-slate-200 p-3">
                      {ev.rating && <p className="font-semibold">Rating: {ev.rating}/5</p>}
                      {ev.notes && <p className="mt-1 text-slate-600">{ev.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
