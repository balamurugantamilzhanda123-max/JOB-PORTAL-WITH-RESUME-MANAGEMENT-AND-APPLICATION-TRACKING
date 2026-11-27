'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { RECRUITER_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function RecruiterEvaluationScorecardPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const applicationId = params?.id;

  const [technicalSkills, setTechnicalSkills] = useState(4);
  const [problemSolving, setProblemSolving] = useState(4);
  const [communication, setCommunication] = useState(4);
  const [roleFit, setRoleFit] = useState(4);
  const [recommendation, setRecommendation] = useState<
    'STRONG_NO' | 'NO' | 'MIXED' | 'YES' | 'STRONG_YES'
  >('YES');
  const [notes, setNotes] = useState('');
  const [isCandidateVisible, setIsCandidateVisible] = useState(false);

  const { data: appData } = useQuery({
    queryKey: ['recruiter-application-detail', applicationId],
    queryFn: () => atsService.getRecruiterApplicationDetail(applicationId),
    enabled: Boolean(applicationId) && user?.role === 'RECRUITER',
  });

  const { data: evalData, isLoading } = useQuery({
    queryKey: ['recruiter-application-evaluations', applicationId],
    queryFn: () => atsService.listEvaluationsForApplication(applicationId),
    enabled: Boolean(applicationId) && user?.role === 'RECRUITER',
  });

  const computedRating =
    Math.round(((technicalSkills + problemSolving + communication + roleFit) / 4) * 10) / 10;

  const submitMutation = useMutation({
    mutationFn: () =>
      atsService.submitEvaluation(applicationId, {
        rating: computedRating,
        recommendation,
        notes,
        isCandidateVisible,
        criteria: {
          technicalSkills,
          problemSolving,
          communication,
          roleFit,
        },
      }),
    onSuccess: () => {
      toast.success('Structured scorecard submitted and audited');
      setNotes('');
      void queryClient.invalidateQueries({
        queryKey: ['recruiter-application-evaluations', applicationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['recruiter-application-detail', applicationId],
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to submit scorecard'),
  });

  return (
    <DashboardShell
      requiredRole="RECRUITER"
      navItems={RECRUITER_NAV_ITEMS}
      activeView="interviews"
      pageTitle="Structured Interview Scorecard"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/recruiter/candidates/${applicationId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Applicant Dossier
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Rubric Evaluation Form
            </CardTitle>
            <CardDescription>
              {appData?.application
                ? `${appData.application.candidate?.fullName} — ${appData.application.job?.title}`
                : 'Score each criterion from 1 (Insufficient Evidence) to 5 (Exceptional Evidence)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Technical Skills', value: technicalSkills, set: setTechnicalSkills },
                  { label: 'Problem Solving', value: problemSolving, set: setProblemSolving },
                  { label: 'Communication', value: communication, set: setCommunication },
                  { label: 'Role Fit / Domain', value: roleFit, set: setRoleFit },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-900">
                      <span>{c.label}</span>
                      <Badge variant="blue">{c.value} / 5</Badge>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={c.value}
                      onChange={(e) => c.set(Number(e.target.value))}
                      className="mt-2 w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>1 Insufficient</span>
                      <span>3 Meets Bar</span>
                      <span>5 Exceptional</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rec-choice">Overall Recommendation</Label>
                  <select
                    id="rec-choice"
                    value={recommendation}
                    onChange={(e) =>
                      setRecommendation(
                        e.target.value as 'STRONG_NO' | 'NO' | 'MIXED' | 'YES' | 'STRONG_YES',
                      )
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="STRONG_YES">Strong Yes</option>
                    <option value="YES">Yes</option>
                    <option value="MIXED">Mixed</option>
                    <option value="NO">No</option>
                    <option value="STRONG_NO">Strong No</option>
                  </select>
                </div>
                <div className="flex flex-col justify-center rounded-lg border border-slate-200 px-4 py-2">
                  <span className="text-xs text-slate-500">Computed Rubric Average</span>
                  <span className="text-lg font-bold text-slate-900">{computedRating} / 5.0</span>
                </div>
              </div>

              <div>
                <Label htmlFor="eval-notes">Observable Evidence &amp; Reasoning (required)</Label>
                <textarea
                  id="eval-notes"
                  rows={5}
                  required
                  minLength={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cite concrete problem-solving trade-offs, technical depth, and role-relevant evidence..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isCandidateVisible}
                  onChange={(e) => setIsCandidateVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Share a candidate-safe feedback summary (unchecked keeps notes strictly internal)
              </label>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={submitMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Audited Scorecard
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Submitted Evaluations</CardTitle>
            <CardDescription>Append-only reviewer records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            ) : (evalData?.evaluations ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">No scorecards submitted yet.</p>
            ) : (
              evalData!.evaluations.map((ev) => (
                <div key={ev.id} className="space-y-1 rounded-lg border border-slate-200 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{ev.reviewer?.fullName || 'Reviewer'}</span>
                    <Badge variant="emerald">{ev.rating}/5</Badge>
                  </div>
                  {ev.recommendation && <Badge variant="blue">{ev.recommendation}</Badge>}
                  {ev.notes && <p className="text-slate-600">{ev.notes}</p>}
                  <p className="text-slate-400">{formatDate(ev.submittedAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
