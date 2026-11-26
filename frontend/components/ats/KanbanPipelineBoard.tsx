'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarPlus,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatDate } from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';
import { ApplicationRecord, ApplicationStage } from '@/types';

const PIPELINE_COLUMNS: Array<{ stage: ApplicationStage; label: string; accent: string }> = [
  { stage: 'APPLIED', label: 'Applied', accent: 'border-t-slate-400' },
  { stage: 'SCREENING', label: 'Screening', accent: 'border-t-amber-500' },
  { stage: 'SHORTLISTED', label: 'Shortlisted', accent: 'border-t-blue-500' },
  { stage: 'INTERVIEW', label: 'Interview', accent: 'border-t-indigo-600' },
  { stage: 'OFFER', label: 'Offer', accent: 'border-t-emerald-500' },
  { stage: 'HIRED', label: 'Hired', accent: 'border-t-emerald-700' },
  { stage: 'REJECTED', label: 'Rejected', accent: 'border-t-red-500' },
];

const NEXT_STAGE_OPTIONS: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: ['SCREENING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'],
  SCREENING: ['SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'OFFER', 'REJECTED'],
  INTERVIEW: ['OFFER', 'HIRED', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

function matchBadgeVariant(score: number | null): 'emerald' | 'amber' | 'red' | 'muted' {
  if (score == null) return 'muted';
  if (score >= 75) return 'emerald';
  if (score >= 45) return 'amber';
  return 'red';
}

export function KanbanPipelineBoard({
  applications,
  showJobTitle = false,
}: {
  applications: ApplicationRecord[];
  showJobTitle?: boolean;
}) {
  const queryClient = useQueryClient();

  const [inspectApp, setInspectApp] = useState<ApplicationRecord | null>(null);
  const [stagePrompt, setStagePrompt] = useState<{
    app: ApplicationRecord;
    targetStage: ApplicationStage;
  } | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Interview Proposal modal state
  const [interviewApp, setInterviewApp] = useState<ApplicationRecord | null>(null);
  const [roundTitle, setRoundTitle] = useState('Technical Interview');
  const [interviewType, setInterviewType] = useState('Technical');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [instructions, setInstructions] = useState('');

  // Scorecard Evaluation modal state
  const [evalApp, setEvalApp] = useState<ApplicationRecord | null>(null);
  const [techScore, setTechScore] = useState(4);
  const [problemScore, setProblemScore] = useState(4);
  const [commScore, setCommScore] = useState(4);
  const [fitScore, setFitScore] = useState(4);
  const [recommendation, setRecommendation] = useState<
    'STRONG_NO' | 'NO' | 'MIXED' | 'YES' | 'STRONG_YES'
  >('YES');
  const [evalNotes, setEvalNotes] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStage, ApplicationRecord[]>();
    for (const col of PIPELINE_COLUMNS) {
      map.set(col.stage, []);
    }
    for (const app of applications) {
      const list = map.get(app.stage);
      if (list) list.push(app);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }
    return map;
  }, [applications]);

  const invalidatePipeline = () => {
    void queryClient.invalidateQueries({ queryKey: ['recruiter-job-applicants'] });
    void queryClient.invalidateQueries({ queryKey: ['recruiter-pipeline'] });
    void queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] });
  };

  const stageMutation = useMutation({
    mutationFn: () => {
      if (!stagePrompt) throw new Error('No stage change selected');
      return atsService.transitionApplicationStage(stagePrompt.app.id, {
        stage: stagePrompt.targetStage,
        publicNote: publicNote.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Candidate moved to ${stagePrompt?.targetStage}`);
      setStagePrompt(null);
      setPublicNote('');
      setInternalNote('');
      invalidatePipeline();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Stage update failed');
    },
  });

  const interviewMutation = useMutation({
    mutationFn: () => {
      if (!interviewApp) throw new Error('No application selected');
      if (!startAt || !endAt) throw new Error('Start and end timestamps are required');
      return atsService.proposeInterview(interviewApp.id, {
        roundTitle: roundTitle.trim(),
        interviewType,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        timezone,
        meetingUrl: meetingUrl.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Interview slot proposed & candidate notified');
      setInterviewApp(null);
      setMeetingUrl('');
      setInstructions('');
      invalidatePipeline();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to propose interview');
    },
  });

  const evalMutation = useMutation({
    mutationFn: () => {
      if (!evalApp) throw new Error('No application selected');
      const avgRating =
        Math.round(((techScore + problemScore + commScore + fitScore) / 4) * 10) / 10;
      return atsService.submitEvaluation(evalApp.id, {
        rating: avgRating,
        recommendation,
        notes: evalNotes.trim(),
        isCandidateVisible: false,
        criteria: {
          technicalSkills: techScore,
          problemSolving: problemScore,
          communication: commScore,
          roleFit: fitScore,
        },
      });
    },
    onSuccess: () => {
      toast.success('Evaluation scorecard submitted');
      setEvalApp(null);
      setEvalNotes('');
      invalidatePipeline();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to submit scorecard');
    },
  });

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((col) => {
          const cards = grouped.get(col.stage) || [];
          return (
            <div
              key={col.stage}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 border-t-4 bg-slate-100/70',
                col.accent,
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-2.5 rounded-t-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {col.label}
                </span>
                <Badge variant="default">{cards.length}</Badge>
              </div>

              <div className="flex-1 space-y-2.5 p-2.5">
                {cards.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No candidates</p>
                ) : (
                  cards.map((app) => {
                    const nextStages = NEXT_STAGE_OPTIONS[app.stage] || [];
                    return (
                      <div
                        key={app.id}
                        className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {app.candidate?.fullName || 'Candidate'}
                            </p>
                            {showJobTitle && app.job && (
                              <p className="truncate text-[11px] font-medium text-teal-700">
                                {app.job.title}
                              </p>
                            )}
                            <p className="truncate text-[11px] text-slate-500">
                              Applied {formatDate(app.appliedAt)}
                            </p>
                          </div>
                          <Badge
                            variant={matchBadgeVariant(app.matchScore)}
                            className="shrink-0 font-mono"
                          >
                            {app.matchScore ?? 0}%
                          </Badge>
                        </div>

                        {app.resumeSnapshot && (
                          <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <FileText className="h-3 w-3 shrink-0" />
                            {app.resumeSnapshot.title} (v{app.resumeSnapshot.version})
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setInspectApp(app)}
                          >
                            <Eye className="h-3 w-3" />
                            Inspect
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                              const end = new Date(tomorrow.getTime() + 45 * 60 * 1000);
                              setStartAt(tomorrow.toISOString().slice(0, 16));
                              setEndAt(end.toISOString().slice(0, 16));
                              setInterviewApp(app);
                            }}
                          >
                            <CalendarPlus className="h-3 w-3" />
                            Interview
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setEvalApp(app)}
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Scorecard
                          </Button>
                        </div>

                        {nextStages.length > 0 && (
                          <select
                            aria-label={`Move ${app.candidate?.fullName} stage`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setStagePrompt({
                                  app,
                                  targetStage: e.target.value as ApplicationStage,
                                });
                              }
                            }}
                            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
                          >
                            <option value="">Move to stage...</option>
                            {nextStages.map((s) => (
                              <option key={s} value={s}>
                                Move → {s}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Candidate Resume Snapshot, Match Breakdown, Screening Answers & Scorecards */}
      <Dialog open={Boolean(inspectApp)} onOpenChange={() => setInspectApp(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{inspectApp?.candidate?.fullName}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              {inspectApp?.candidate?.email} • Stage: {inspectApp?.stage}
            </DialogDescription>
          </DialogHeader>

          {inspectApp && (
            <div className="space-y-5 text-sm">
              {/* Resume Snapshot */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Locked Resume Snapshot: {inspectApp.resumeSnapshot?.title || 'Resume'} (v
                      {inspectApp.resumeSnapshot?.version ?? 1})
                    </p>
                    <p className="text-xs text-slate-500">
                      Captured {inspectApp.resumeSnapshot?.capturedAt ? formatDate(inspectApp.resumeSnapshot.capturedAt) : formatDate(inspectApp.appliedAt)}
                    </p>
                  </div>
                  {inspectApp.resumeId && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={atsService.getResumeDownloadUrl(inspectApp.resumeId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Resume
                      </a>
                    </Button>
                  )}
                </div>

                {inspectApp.resumeSnapshot?.skills?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {inspectApp.resumeSnapshot.skills.map((sk) => (
                      <Badge key={sk} variant="blue">
                        {sk}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Advisory Match Breakdown */}
              {inspectApp.scoreBreakdown && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      Advisory ATS Match Breakdown
                    </span>
                    <span className="font-mono text-lg font-bold text-blue-700">
                      {inspectApp.scoreBreakdown.totalScore}%
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Skills ({inspectApp.scoreBreakdown.requiredSkillCoverage.score}/
                    {inspectApp.scoreBreakdown.requiredSkillCoverage.maxScore}) •{' '}
                    {inspectApp.scoreBreakdown.experienceAlignment.status}
                  </p>
                </div>
              )}

              {/* Screening Answers */}
              {inspectApp.screeningAnswers && inspectApp.screeningAnswers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Screening Responses
                  </h4>
                  {inspectApp.screeningAnswers.map((ans) => (
                    <div
                      key={ans.questionId}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900">{ans.questionTitle}</p>
                      <p className="mt-1 text-slate-600">
                        {Array.isArray(ans.answer)
                          ? ans.answer.join(', ')
                          : typeof ans.answer === 'boolean'
                            ? ans.answer
                              ? 'Yes'
                              : 'No'
                            : ans.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cover Note */}
              {inspectApp.coverNote && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                  <p className="font-semibold text-slate-900">Candidate Cover Note</p>
                  <p className="mt-1 text-slate-600">{inspectApp.coverNote}</p>
                </div>
              )}

              {/* Existing Internal Evaluations */}
              {inspectApp.evaluations && inspectApp.evaluations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Internal Reviewer Scorecards ({inspectApp.evaluations.length})
                  </h4>
                  {inspectApp.evaluations.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {ev.reviewer?.fullName || 'Reviewer'} • {ev.recommendation}
                        </span>
                        <Badge variant="blue">
                          <Star className="h-3 w-3 fill-current" />
                          {ev.rating}/5
                        </Badge>
                      </div>
                      <p className="mt-1 text-slate-700">{ev.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stage Transition Confirmation Modal */}
      <Dialog open={Boolean(stagePrompt)} onOpenChange={() => setStagePrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move {stagePrompt?.app.candidate?.fullName} to {stagePrompt?.targetStage}?
            </DialogTitle>
            <DialogDescription>
              Updates the candidate&apos;s live tracker immediately and logs an audit event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stage-public-note">Candidate-Visible Note (Optional)</Label>
              <Input
                id="stage-public-note"
                value={publicNote}
                onChange={(e) => setPublicNote(e.target.value)}
                placeholder="e.g., Moving forward to technical screening!"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stage-internal-note">Internal Recruiter Note (Private)</Label>
              <Input
                id="stage-internal-note"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Never exposed to candidate..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStagePrompt(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={stagePrompt?.targetStage === 'REJECTED' ? 'destructive' : 'primary'}
                disabled={stageMutation.isPending}
                onClick={() => stageMutation.mutate()}
              >
                {stageMutation.isPending ? 'Updating...' : 'Confirm Move'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Propose Interview Modal */}
      <Dialog open={Boolean(interviewApp)} onOpenChange={() => setInterviewApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview — {interviewApp?.candidate?.fullName}</DialogTitle>
            <DialogDescription>
              Propose an interview slot; the candidate will receive an instant notification to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Round Title *</Label>
                <Input value={roundTitle} onChange={(e) => setRoundTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="Technical">Technical</option>
                  <option value="System Design">System Design</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                  <option value="HR Screening">HR Screening</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Start Date &amp; Time *</Label>
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>End Date &amp; Time *</Label>
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Timezone</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Meeting URL (Optional)</Label>
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Candidate Instructions</Label>
              <Input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Topics to prepare..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInterviewApp(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={interviewMutation.isPending}
                onClick={() => interviewMutation.mutate()}
              >
                {interviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Propose Interview'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Structured 1-5 Scorecard Evaluation Modal */}
      <Dialog open={Boolean(evalApp)} onOpenChange={() => setEvalApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Interview Scorecard — {evalApp?.candidate?.fullName}</DialogTitle>
            <DialogDescription>
              Internal reviewer feedback (private from candidate).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Technical Skills (1–5)', val: techScore, set: setTechScore },
                { label: 'Problem Solving (1–5)', val: problemScore, set: setProblemScore },
                { label: 'Communication (1–5)', val: commScore, set: setCommScore },
                { label: 'Role Fit (1–5)', val: fitScore, set: setFitScore },
              ].map((c) => (
                <div key={c.label} className="space-y-1">
                  <Label>{c.label}</Label>
                  <select
                    value={c.val}
                    onChange={(e) => c.set(Number(e.target.value))}
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Overall Recommendation</Label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as typeof recommendation)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="STRONG_YES">Strong Yes</option>
                <option value="YES">Yes</option>
                <option value="MIXED">Mixed</option>
                <option value="NO">No</option>
                <option value="STRONG_NO">Strong No</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Evidence &amp; Reviewer Notes *</Label>
              <textarea
                rows={3}
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
                placeholder="Record concrete observable strengths and concerns..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEvalApp(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={evalNotes.trim().length < 5 || evalMutation.isPending}
                onClick={() => evalMutation.mutate()}
              >
                {evalMutation.isPending ? 'Submitting...' : 'Submit Scorecard'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

