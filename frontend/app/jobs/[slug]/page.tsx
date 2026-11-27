'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { atsService } from '@/services/ats.service';

export default function PublicJobSlugPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const idOrSlug = params?.slug;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-job-detail', idOrSlug],
    queryFn: () => atsService.getPublicJobDetail(idOrSlug),
    enabled: Boolean(idOrSlug),
  });

  const job = data?.job;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-slate-900">TalentForge Jobs</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">
                <ArrowLeft className="h-4 w-4" />
                All Openings
              </Link>
            </Button>
            {user?.role === 'CANDIDATE' && job ? (
              <Button asChild variant="primary" size="sm">
                <Link href={`/candidate/jobs?jobId=${job.id}`}>
                  Apply in Candidate Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="primary" size="sm">
                <Link href="/login">Sign in to Apply</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="amber">DEMO PORTAL</Badge>
          <span className="text-xs text-slate-500">
            Listings marked DEMO represent illustrative sample roles, not live commercial vacancies.
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading role details...
          </div>
        ) : isError || !job ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-900">Job opening unavailable</p>
            <p className="mt-1 text-sm text-slate-500">
              This role may be closed, paused, or removed from public listings.
            </p>
            <Button asChild className="mt-4" variant="outline" size="sm">
              <Link href="/jobs">Browse Published Jobs</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-sm font-medium text-blue-950">
                Interested in this role? Open it in your candidate workspace to bookmark or submit an application.
              </p>
              {user?.role === 'CANDIDATE' ? (
                <Button asChild variant="primary" size="sm">
                  <Link href={`/candidate/jobs?jobId=${job.id}`}>Open to Bookmark &amp; Apply</Link>
                </Button>
              ) : (
                <Button asChild variant="primary" size="sm">
                  <Link href="/register">Create Candidate Account to Apply</Link>
                </Button>
              )}
            </div>
            <JobPreviewCard job={job} />
          </div>
        )}
      </main>
    </div>
  );
}
