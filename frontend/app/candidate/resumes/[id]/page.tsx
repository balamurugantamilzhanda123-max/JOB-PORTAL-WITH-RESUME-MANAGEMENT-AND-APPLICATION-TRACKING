'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import { formatDate } from '@/lib/utils';
import { atsService } from '@/services/ats.service';

export default function CandidateResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const resumeId = params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['candidate-resume-detail', resumeId],
    queryFn: () => atsService.getResumeDetail(resumeId),
    enabled: Boolean(resumeId) && user?.role === 'CANDIDATE',
  });

  const resume = data?.resume;

  const [title, setTitle] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [summary, setSummary] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!resume) return;
    setTitle(resume.title);
    setSkillsText(resume.skills.join(', '));
    setSummary(resume.parsedJson?.summary ?? resume.parsedJson?.rawTextPreview ?? '');
    setEmail(resume.parsedJson?.contact?.email ?? '');
    setPhone(resume.parsedJson?.contact?.phone ?? '');
    setLocation(resume.parsedJson?.contact?.location ?? '');
  }, [resume]);

  const updateMutation = useMutation({
    mutationFn: () =>
      atsService.updateResume(resumeId, {
        title,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        summary,
        email,
        phone,
        location,
      }),
    onSuccess: () => {
      toast.success('Parsed resume details updated');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resume-detail', resumeId] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to save updates'),
  });

  const reparseMutation = useMutation({
    mutationFn: () => atsService.reparseResume(resumeId),
    onSuccess: () => {
      toast.success('Resume re-parsed cleanly');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resume-detail', resumeId] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to reparse'),
  });

  const defaultMutation = useMutation({
    mutationFn: () => atsService.setDefaultResume(resumeId),
    onSuccess: () => {
      toast.success('Default resume updated');
      void queryClient.invalidateQueries({ queryKey: ['candidate-resume-detail', resumeId] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => atsService.deleteResume(resumeId),
    onSuccess: () => {
      toast.success('Resume removed from vault');
      router.push('/candidate/resumes');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Unable to delete resume'),
  });

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="resumes"
      pageTitle="Resume Details & Parsed Output"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/candidate/resumes">
            <ArrowLeft className="h-4 w-4" />
            Back to Resume Vault
          </Link>
        </Button>

        {resume && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={atsService.getResumeDownloadUrl(resume.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Open / Download File
              </a>
            </Button>
            {!resume.isDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => defaultMutation.mutate()}
                disabled={defaultMutation.isPending}
              >
                <Star className="h-4 w-4" />
                Set Default
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reparseMutation.mutate()}
              disabled={reparseMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 ${reparseMutation.isPending ? 'animate-spin' : ''}`}
              />
              Re-run Parser
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
          Loading resume metadata and parsed output...
        </div>
      ) : isError || !resume ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error instanceof Error ? error.message : 'Resume not found'}
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
                      <FileText className="h-5 w-5 text-blue-600" />
                      {resume.title}
                    </CardTitle>
                    <CardDescription>
                      Version v{resume.version} • {resume.fileName || 'Document'} • Uploaded{' '}
                      {formatDate(resume.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {resume.isDefault && <Badge variant="emerald">Default</Badge>}
                    <Badge variant="blue">{resume.parseStatus}</Badge>
                    <Badge variant="muted">Parser {resume.parserVersion}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="res-title">Resume Title</Label>
                      <Input
                        id="res-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-email">Extracted Email</Label>
                      <Input
                        id="res-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-phone">Extracted Phone</Label>
                      <Input
                        id="res-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-loc">Extracted Location</Label>
                      <Input
                        id="res-loc"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="res-skills">Verified Skills (comma-separated)</Label>
                    <Input
                      id="res-skills"
                      value={skillsText}
                      onChange={(e) => setSkillsText(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="res-summary">Summary</Label>
                    <textarea
                      id="res-summary"
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4" />
                      Save Corrections
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {resume.parsedJson?.experience?.highlights &&
              resume.parsedJson.experience.highlights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Extracted Experience Evidence</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    {resume.parsedJson.experience.highlights.map((snippet, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        {snippet}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected Skill Evidence</CardTitle>
                <CardDescription>Extracted evidence snippets from uploaded document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(resume.parsedJson?.skills ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No skill evidence snippets extracted; add skills manually on the left.
                  </p>
                ) : (
                  (resume.parsedJson?.skills ?? []).map((sk, idx) => (
                    <div
                      key={`${sk.normalizedKey}-${idx}`}
                      className="rounded-lg border border-slate-200 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {sk.name}
                        </span>
                        <span className="text-slate-500">
                          {Math.round((sk.confidence ?? 0.8) * 100)}%
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500">{sk.evidenceSnippet}</p>
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
