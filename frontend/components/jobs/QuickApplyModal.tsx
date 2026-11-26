'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2, Send } from 'lucide-react';
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
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';
import { Job } from '@/types';

interface QuickApplyModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
}

export function QuickApplyModal({
  job,
  open,
  onOpenChange,
  onApplied,
}: QuickApplyModalProps) {
  const queryClient = useQueryClient();
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | boolean | string[]>>({});
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );

  const { data: resumesData, isLoading: resumesLoading } = useQuery({
    queryKey: ['candidate-resumes'],
    queryFn: () => atsService.listResumes(),
    enabled: open,
  });

  const resumes = useMemo(() => resumesData?.resumes ?? [], [resumesData?.resumes]);

  useEffect(() => {
    if (resumes.length > 0 && !resumes.some((r) => r.id === selectedResumeId)) {
      const def = resumes.find((r) => r.isDefault) || resumes[0];
      setSelectedResumeId(def.id);
    }
  }, [resumes, selectedResumeId]);

  const { data: readinessData } = useQuery({
    queryKey: ['resume-readiness', job?.id, selectedResumeId],
    queryFn: () => atsService.getResumeReadiness(job!.id, selectedResumeId),
    enabled: Boolean(open && job?.id && selectedResumeId),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error('No job selected');
      if (!selectedResumeId) throw new Error('Please upload or select a resume first');

      const screeningAnswers = (job.screeningQuestions || [])
        .map((q) => ({
          questionId: q.id!,
          answer: answers[q.id!],
        }))
        .filter((a) => a.questionId && a.answer !== undefined && a.answer !== '');

      return atsService.submitApplication(job.id, {
        resumeId: selectedResumeId,
        coverNote: coverNote.trim() || undefined,
        idempotencyKey,
        screeningAnswers,
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Application submitted for ${job?.title} (Advisory match: ${res.application.matchScore ?? 0}%)`,
      );
      void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
      onOpenChange(false);
      onApplied?.();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Unable to submit application');
    },
  });

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Apply — {job.title}</DialogTitle>
          <DialogDescription>
            {job.company} • Locks an immutable snapshot of your selected resume version.
          </DialogDescription>
        </DialogHeader>

        {resumesLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading your resume vault...
          </div>
        ) : resumes.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">No resume found in your Resume Vault</p>
            <p className="text-xs text-amber-800">
              Upload at least one PDF or DOCX resume to apply with an immutable snapshot.
            </p>
            <Button asChild variant="primary" size="sm">
              <Link href="/candidate/resumes">
                <FileText className="h-4 w-4" />
                Go to Resume Vault
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Resume Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="apply-resume-select">Select Resume Snapshot *</Label>
              <select
                id="apply-resume-select"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} (v{r.version}) {r.isDefault ? '— Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Match Preview */}
            {readinessData && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    Advisory Skill Match Preview
                  </span>
                  <span className="font-mono text-base font-bold text-blue-700">
                    {readinessData.readiness.totalScore}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {readinessData.readiness.requiredSkillCoverage.matchedSkills.map((sk) => (
                    <Badge key={sk} variant="emerald">
                      <CheckCircle2 className="h-3 w-3" />
                      {sk}
                    </Badge>
                  ))}
                  {readinessData.readiness.requiredSkillCoverage.missingSkills.map((sk) => (
                    <Badge key={sk} variant="amber">
                      Missing: {sk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Screening Questions */}
            {job.screeningQuestions && job.screeningQuestions.length > 0 && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Screening Questions
                </p>
                {job.screeningQuestions.map((q) => {
                  const qId = q.id!;
                  const val = answers[qId];
                  return (
                    <div key={qId} className="space-y-1.5">
                      <Label>
                        {q.title} {q.isRequired && <span className="text-red-500">*</span>}
                      </Label>

                      {q.questionType === 'YES_NO' ? (
                        <div className="flex gap-2">
                          {(['Yes', 'No'] as const).map((opt) => (
                            <Button
                              key={opt}
                              type="button"
                              size="sm"
                              variant={val === (opt === 'Yes') ? 'primary' : 'outline'}
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [qId]: opt === 'Yes' }))
                              }
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      ) : q.questionType === 'SINGLE_CHOICE' ? (
                        <select
                          value={typeof val === 'string' ? val : ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [qId]: e.target.value }))
                          }
                          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                        >
                          <option value="">Select an option...</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : q.questionType === 'MULTIPLE_CHOICE' ? (
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => {
                            const selectedList = Array.isArray(val) ? val : [];
                            const active = selectedList.includes(opt);
                            return (
                              <Button
                                key={opt}
                                type="button"
                                size="sm"
                                variant={active ? 'primary' : 'outline'}
                                onClick={() => {
                                  const next = active
                                    ? selectedList.filter((x) => x !== opt)
                                    : [...selectedList, opt];
                                  setAnswers((prev) => ({ ...prev, [qId]: next }));
                                }}
                              >
                                {opt}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          value={typeof val === 'string' ? val : ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [qId]: e.target.value }))
                          }
                          placeholder="Your response..."
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cover Note */}
            <div className="space-y-1.5">
              <Label htmlFor="cover-note">Optional Cover Note</Label>
              <textarea
                id="cover-note"
                rows={3}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Share a brief note for the hiring manager..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

