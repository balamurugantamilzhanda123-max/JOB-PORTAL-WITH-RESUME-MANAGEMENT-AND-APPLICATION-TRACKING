'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { cn, formatDate } from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';
import { jobsService } from '@/services/jobs.service';

export default function CandidateResumesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [targetJobId, setTargetJobId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['candidate-resumes'],
    queryFn: () => atsService.listResumes(),
    enabled: user?.role === 'CANDIDATE',
  });

  const { data: jobsData } = useQuery({
    queryKey: ['candidate-jobs', { limit: 30, sort: 'newest' }],
    queryFn: () => jobsService.searchCandidateJobs({ sort: 'newest', limit: 30 }),
    enabled: user?.role === 'CANDIDATE',
  });

  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);

  useEffect(() => {
    if (resumes.length > 0 && (!selectedResumeId || !resumes.some((r) => r.id === selectedResumeId))) {
      const def = resumes.find((r) => r.isDefault) || resumes[0];
      setSelectedResumeId(def.id);
    } else if (resumes.length === 0) {
      setSelectedResumeId(null);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    if (jobsData?.items?.length && !targetJobId) {
      setTargetJobId(jobsData.items[0].id);
    }
  }, [jobsData?.items, targetJobId]);

  const selectedResume = useMemo(
    () => resumes.find((r) => r.id === selectedResumeId) || null,
    [resumes, selectedResumeId],
  );

  const { data: readinessData, isFetching: readinessLoading } = useQuery({
    queryKey: ['resume-readiness', targetJobId, selectedResumeId],
    queryFn: () => atsService.getResumeReadiness(targetJobId, selectedResumeId!),
    enabled: Boolean(targetJobId && selectedResumeId && user?.role === 'CANDIDATE'),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please choose a PDF or DOCX file.');
      const fd = new FormData();
      fd.append('file', file);
      if (title.trim()) fd.append('title', title.trim());
      fd.append('isDefault', String(setAsDefault));
      return atsService.uploadResume(fd);
    },
    onSuccess: (res) => {
      toast.success(`Uploaded "${res.resume.title}" (v${res.resume.version}) and parsed skills`);
      setTitle('');
      setFile(null);
      setSelectedResumeId(res.resume.id);
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to upload resume');
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => atsService.setDefaultResume(id),
    onSuccess: () => {
      toast.success('Default resume updated');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : 'Failed'),
  });

  const reparseMutation = useMutation({
    mutationFn: (id: string) => atsService.reparseResume(id),
    onSuccess: () => {
      toast.success('Resume re-parsed successfully');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
      void queryClient.invalidateQueries({ queryKey: ['resume-readiness'] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : 'Reparse failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => atsService.deleteResume(id),
    onSuccess: () => {
      toast.success('Resume removed from vault');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : 'Delete failed'),
  });

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="resumes"
      pageTitle="Resume Management Vault"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT PANEL: Upload + Versioned Vault List */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                Upload Resume Version
              </CardTitle>
              <CardDescription>
                Private PDF or DOCX storage (max 5 MB) with automated skill extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="resume-title">Resume Label</Label>
                <Input
                  id="resume-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Backend Python Resume"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resume-file">PDF or DOCX File *</Label>
                <Input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Set as default resume for Quick Apply</span>
              </label>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={!file || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading &amp; Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload &amp; Parse Resume
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version History ({resumes.length})</CardTitle>
              <CardDescription>Each upload creates an immutable version record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isError ? (
                <div className="flex items-center justify-between text-xs text-red-600">
                  <span>{error instanceof Error ? error.message : 'Failed to load resumes'}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading resume vault...
                </div>
              ) : resumes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Your Resume Vault is empty"
                  description="Upload a PDF or DOCX resume above to extract skills and unlock 1-click applications."
                />
              ) : (
                resumes.map((r) => (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedResumeId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectedResumeId(r.id);
                    }}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3.5 transition-all',
                      r.id === selectedResume?.id
                        ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          v{r.version} • {r.fileName || 'document'} • {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {r.isDefault && <Badge variant="blue">Default</Badge>}
                        <Badge variant="emerald">{r.parseStatus}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {!r.isDefault && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            defaultMutation.mutate(r.id);
                          }}
                        >
                          <Star className="h-3 w-3" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          reparseMutation.mutate(r.id);
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reparse
                      </Button>
                      <Button asChild type="button" size="sm" variant="outline">
                        <a
                          href={atsService.getResumeDownloadUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Parsed Preview + Live Target-Job ATS Readiness */}
        <div className="space-y-6 lg:col-span-7">
          {!selectedResume ? (
            <EmptyState
              icon={Sparkles}
              title="Select or upload a resume to inspect parsed skills"
              description="Parsed skill evidence, word count, and target-job keyword gap analysis appear here."
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>
                        {selectedResume.title} (v{selectedResume.version})
                      </CardTitle>
                      <CardDescription>
                        Parser v{selectedResume.parserVersion} •{' '}
                        {selectedResume.parsedJson?.wordCount ?? 0} words extracted
                      </CardDescription>
                    </div>
                    <Badge variant="emerald">{selectedResume.skills.length} Skills Detected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Extracted Skills &amp; Evidence
                    </h3>
                    {selectedResume.skills.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        No known technical taxonomy keywords were detected in this file.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedResume.skills.map((sk) => (
                          <Badge key={sk} variant="blue">
                            {sk}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedResume.parsedJson?.experience?.highlights?.length ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Detected Experience Highlights
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                        {selectedResume.parsedJson.experience.highlights.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedResume.parsedJson?.education?.length ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Education Signals
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                        {selectedResume.parsedJson.education.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Target-Job ATS Keyword Readiness Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Target Job ATS Readiness Check
                  </CardTitle>
                  <CardDescription>
                    Compare this resume version against any published job&apos;s required skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="target-job-select">Select Target Published Job</Label>
                    <select
                      id="target-job-select"
                      value={targetJobId}
                      onChange={(e) => setTargetJobId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    >
                      {!jobsData?.items?.length && <option value="">No published jobs available</option>}
                      {jobsData?.items?.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} — {j.company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {readinessLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Computing advisory keyword alignment...
                    </div>
                  ) : readinessData ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Advisory Match Score
                          </p>
                          <p className="text-xs text-slate-500">
                            {readinessData.readiness.experienceAlignment.status}
                          </p>
                        </div>
                        <span className="font-mono text-2xl font-bold text-blue-600">
                          {readinessData.readiness.totalScore}%
                        </span>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${readinessData.readiness.totalScore}%` }}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Matched Skills (
                            {readinessData.readiness.requiredSkillCoverage.matchedSkills.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {readinessData.readiness.requiredSkillCoverage.matchedSkills.map(
                              (sk) => (
                                <Badge key={sk} variant="emerald">
                                  {sk}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Not Detected in Resume (
                            {readinessData.readiness.requiredSkillCoverage.missingSkills.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {readinessData.readiness.requiredSkillCoverage.missingSkills.length ===
                            0 ? (
                              <span className="text-xs text-emerald-700">
                                All required skills detected!
                              </span>
                            ) : (
                              readinessData.readiness.requiredSkillCoverage.missingSkills.map(
                                (sk) => (
                                  <Badge key={sk} variant="amber">
                                    {sk}
                                  </Badge>
                                ),
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">{readinessData.disclaimer}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

