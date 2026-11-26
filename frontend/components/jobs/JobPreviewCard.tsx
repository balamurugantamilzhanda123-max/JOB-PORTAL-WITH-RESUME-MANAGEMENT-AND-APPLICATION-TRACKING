'use client';

import React from 'react';
import {
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Layers,
  MapPin,
  Send,
  Wallet,
} from 'lucide-react';
import { SafeRichText } from '@/components/jobs/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatEmploymentType,
  formatExperienceLevel,
  formatQuestionType,
  formatSalaryRange,
  formatWorkMode,
} from '@/lib/utils';
import {
  EmploymentType,
  ExperienceLevel,
  JobScreeningQuestion,
  WorkMode,
} from '@/types';

export interface JobPreviewData {
  id?: string;
  title: string;
  company: string;
  department: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  summary?: string | null;
  description: string;
  responsibilities?: string | null;
  requiredQualifications?: string | null;
  preferredQualifications?: string | null;
  benefits?: string | null;
  requiredSkills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryUndisclosed: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  screeningQuestions?: JobScreeningQuestion[];
  isBookmarked?: boolean;
}

interface JobPreviewCardProps {
  job: JobPreviewData;
  onToggleBookmark?: () => void;
  bookmarkPending?: boolean;
  onApplyClick?: () => void;
  hasApplied?: boolean;
  showPhase4ApplyNotice?: boolean;
}

export function JobPreviewCard({
  job,
  onToggleBookmark,
  bookmarkPending,
  onApplyClick,
  hasApplied,
  showPhase4ApplyNotice = false,
}: JobPreviewCardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {job.company || 'Company Name'}
              </span>
              <span>•</span>
              <span>{job.department || 'Department'}</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {job.title || 'Untitled Position'}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onToggleBookmark && (
              <Button
                type="button"
                variant={job.isBookmarked ? 'secondary' : 'outline'}
                size="sm"
                disabled={bookmarkPending}
                onClick={onToggleBookmark}
                className="shrink-0"
              >
                <Bookmark
                  className={`h-4 w-4 ${job.isBookmarked ? 'fill-blue-600 text-blue-600' : ''}`}
                />
                {job.isBookmarked ? 'Saved' : 'Save Job'}
              </Button>
            )}

            {onApplyClick &&
              (hasApplied ? (
                <Badge variant="emerald" className="px-3 py-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Applied
                </Badge>
              ) : (
                <Button type="button" variant="primary" size="sm" onClick={onApplyClick}>
                  <Send className="h-3.5 w-3.5" />
                  Quick Apply
                </Button>
              ))}
          </div>
        </div>

        {/* Metadata pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
          <Badge variant="default">
            <Briefcase className="h-3 w-3" />
            {formatEmploymentType(job.employmentType)}
          </Badge>
          <Badge variant="default">
            <Layers className="h-3 w-3" />
            {formatExperienceLevel(job.experienceLevel)}
          </Badge>
          <Badge variant="default">
            <MapPin className="h-3 w-3" />
            {job.location || 'Remote'}
          </Badge>
          <Badge variant="emerald">
            <Wallet className="h-3 w-3" />
            {formatSalaryRange({
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              salaryCurrency: job.salaryCurrency,
              salaryUndisclosed: job.salaryUndisclosed,
            })}
          </Badge>
          {(job.publishedAt || job.createdAt) && (
            <Badge variant="muted">
              <Calendar className="h-3 w-3" />
              {job.publishedAt
                ? `Published ${formatDate(job.publishedAt)}`
                : `Created ${formatDate(job.createdAt!)}`}
            </Badge>
          )}
        </div>

        {showPhase4ApplyNotice && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            <span>
              Recruiter preview mode — candidates can bookmark and Quick Apply using a Resume Vault snapshot.
            </span>
          </div>
        )}
      </div>

      {/* Required Skills */}
      {job.requiredSkills.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Required Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {job.summary && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Role Summary
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">{job.summary}</p>
        </div>
      )}

      {/* Detailed Description */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Job Description
        </h3>
        {job.description ? (
          <SafeRichText html={job.description} />
        ) : (
          <p className="text-sm italic text-slate-400">No description provided yet.</p>
        )}
      </div>

      {job.responsibilities && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Key Responsibilities
          </h3>
          <SafeRichText html={job.responsibilities} />
        </div>
      )}

      {job.requiredQualifications && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Required Qualifications
          </h3>
          <SafeRichText html={job.requiredQualifications} />
        </div>
      )}

      {job.preferredQualifications && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Preferred Qualifications
          </h3>
          <SafeRichText html={job.preferredQualifications} />
        </div>
      )}

      {job.benefits && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Benefits &amp; Perks
          </h3>
          <SafeRichText html={job.benefits} />
        </div>
      )}

      {/* Screening Questions Preview */}
      {job.screeningQuestions && job.screeningQuestions.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              Screening Questions ({job.screeningQuestions.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Responses collected during Phase 4 application flow
            </span>
          </div>
          <div className="space-y-2.5">
            {job.screeningQuestions.map((q, idx) => (
              <div
                key={`${q.title}-${idx}`}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {idx + 1}. {q.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default">{formatQuestionType(q.questionType)}</Badge>
                    <Badge variant={q.isRequired ? 'blue' : 'muted'}>
                      {q.isRequired ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                </div>
                {q.options && q.options.length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Options: {q.options.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

