'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Rocket,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { RichTextEditor } from '@/components/jobs/RichTextEditor';
import { ScreeningQuestionBuilder } from '@/components/jobs/ScreeningQuestionBuilder';
import { SkillTagInput } from '@/components/jobs/SkillTagInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError } from '@/services/api';
import { jobsService, JobUpsertPayload } from '@/services/jobs.service';
import {
  EmploymentType,
  ExperienceLevel,
  Job,
  JobScreeningQuestion,
  WorkMode,
} from '@/types';

interface JobFormBuilderProps {
  initialJob?: Job;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function JobFormBuilder({ initialJob }: JobFormBuilderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(initialJob);

  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Section 1: Basic Info
  const [title, setTitle] = useState(initialJob?.title || '');
  const [company, setCompany] = useState(initialJob?.company || '');
  const [department, setDepartment] = useState(initialJob?.department || 'Engineering');
  const [location, setLocation] = useState(initialJob?.location || '');
  const [country, setCountry] = useState(initialJob?.country || 'India');
  const [stateVal, setStateVal] = useState(initialJob?.state || '');
  const [city, setCity] = useState(initialJob?.city || '');
  const [workMode, setWorkMode] = useState<WorkMode>(initialJob?.workMode || 'HYBRID');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialJob?.employmentType || 'FULL_TIME',
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialJob?.experienceLevel || 'ENTRY_LEVEL',
  );

  // Section 2: Descriptions
  const [summary, setSummary] = useState(initialJob?.summary || '');
  const [description, setDescription] = useState(initialJob?.description || '');
  const [responsibilities, setResponsibilities] = useState(initialJob?.responsibilities || '');
  const [requiredQualifications, setRequiredQualifications] = useState(
    initialJob?.requiredQualifications || '',
  );
  const [preferredQualifications, setPreferredQualifications] = useState(
    initialJob?.preferredQualifications || '',
  );
  const [benefits, setBenefits] = useState(initialJob?.benefits || '');

  // Section 3: Skills
  const [requiredSkills, setRequiredSkills] = useState<string[]>(
    initialJob?.requiredSkills || [],
  );

  // Section 4: Salary
  const [salaryMin, setSalaryMin] = useState<string>(
    initialJob?.salaryMin != null ? String(initialJob.salaryMin) : '',
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    initialJob?.salaryMax != null ? String(initialJob.salaryMax) : '',
  );
  const [salaryCurrency, setSalaryCurrency] = useState(initialJob?.salaryCurrency || 'INR');
  const [salaryUndisclosed, setSalaryUndisclosed] = useState(
    initialJob?.salaryUndisclosed ?? false,
  );

  // Section 5: Screening Questions
  const [screeningQuestions, setScreeningQuestions] = useState<JobScreeningQuestion[]>(
    initialJob?.screeningQuestions || [],
  );

  const mutation = useMutation({
    mutationFn: async (payload: JobUpsertPayload) => {
      if (isEditing && initialJob) {
        return jobsService.updateRecruiterJob(initialJob.id, payload);
      }
      return jobsService.createRecruiterJob(payload);
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['recruiter-job-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] });
      toast.success(
        res.job.status === 'PUBLISHED'
          ? 'Job posting published successfully'
          : 'Job posting saved as draft',
      );
      router.push('/recruiter/jobs');
    },
    onError: (err) => {
      const message =
        err instanceof ApiClientError ? err.message : 'Unable to save job posting.';
      setFormError(message);
      toast.error(message);
    },
  });

  const resolvedLocation =
    location.trim() ||
    [city.trim(), stateVal.trim(), country.trim()].filter(Boolean).join(', ') ||
    (workMode === 'REMOTE' ? 'Remote' : '');

  const parsedMin = salaryMin.trim() !== '' ? Number(salaryMin) : null;
  const parsedMax = salaryMax.trim() !== '' ? Number(salaryMax) : null;

  const validateAndSubmit = (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    setFormError(null);

    if (title.trim().length < 2) {
      setFormError('Job title is required (at least 2 characters).');
      return;
    }
    if (company.trim().length < 2) {
      setFormError('Company name is required.');
      return;
    }
    if (department.trim().length < 2) {
      setFormError('Department is required.');
      return;
    }

    if (!salaryUndisclosed) {
      if ((parsedMin !== null && parsedMin < 0) || (parsedMax !== null && parsedMax < 0)) {
        setFormError('Salary values must be non-negative.');
        return;
      }
      if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
        setFormError('Minimum salary cannot exceed maximum salary.');
        return;
      }
    }

    if (targetStatus === 'PUBLISHED') {
      if (stripTags(description).length < 30) {
        setFormError(
          'Detailed job description must be at least 30 characters before publishing.',
        );
        return;
      }
      if (requiredSkills.length === 0) {
        setFormError('Please add at least one required skill before publishing.');
        return;
      }
      if (workMode !== 'REMOTE' && !resolvedLocation) {
        setFormError('Location is required for Hybrid and Onsite roles.');
        return;
      }
    }

    const payload: JobUpsertPayload = {
      title: title.trim(),
      company: company.trim(),
      department: department.trim(),
      location: resolvedLocation,
      country: country.trim() || null,
      state: stateVal.trim() || null,
      city: city.trim() || null,
      workMode,
      employmentType,
      experienceLevel,
      summary: summary.trim() || null,
      description,
      responsibilities: responsibilities || null,
      requiredQualifications: requiredQualifications || null,
      preferredQualifications: preferredQualifications || null,
      benefits: benefits || null,
      requiredSkills,
      salaryMin: salaryUndisclosed ? null : parsedMin,
      salaryMax: salaryUndisclosed ? null : parsedMax,
      salaryCurrency: salaryCurrency.toUpperCase(),
      salaryUndisclosed,
      status: targetStatus,
      screeningQuestions: screeningQuestions.map((q, idx) => ({
        ...q,
        orderIndex: idx,
      })),
    };

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {isEditing ? `Edit Job: ${initialJob?.title}` : 'Create New Job Posting'}
            </h2>
            {initialJob && <Badge>{initialJob.status}</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            Complete all 6 sections to publish immediately, or save your progress as a draft.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((p) => !p)}
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Back to Editor' : 'Preview Job'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/recruiter/jobs')}
          >
            Cancel
          </Button>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {showPreview ? (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Candidate Job Preview</CardTitle>
                <CardDescription>
                  This is how candidates will see your posting once published
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => validateAndSubmit('DRAFT')}
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => validateAndSubmit('PUBLISHED')}
                >
                  <Rocket className="h-4 w-4" />
                  Publish Job
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <JobPreviewCard
              job={{
                title,
                company,
                department,
                location: resolvedLocation || 'Remote',
                workMode,
                employmentType,
                experienceLevel,
                summary,
                description,
                responsibilities,
                requiredQualifications,
                preferredQualifications,
                benefits,
                requiredSkills,
                salaryMin: salaryUndisclosed ? null : parsedMin,
                salaryMax: salaryUndisclosed ? null : parsedMax,
                salaryCurrency,
                salaryUndisclosed,
                screeningQuestions,
              }}
              showPhase4ApplyNotice={false}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Basic Job Information */}
          <Card>
            <CardHeader>
              <CardTitle>1. Basic Job Information</CardTitle>
              <CardDescription>
                Core role identity, location hierarchy, work mode, and seniority level
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="job-title">Job Title *</Label>
                <Input
                  id="job-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Python Backend Engineer"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-company">Company Name *</Label>
                <Input
                  id="job-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Acme Cloud Systems"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-department">Department *</Label>
                <Input
                  id="job-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Engineering, Data Science"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-work-mode">Work Mode *</Label>
                <select
                  id="job-work-mode"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">Onsite</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-employment-type">Employment Type *</Label>
                <select
                  id="job-employment-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-experience">Experience Level</Label>
                <select
                  id="job-experience"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="FRESHER">Fresher</option>
                  <option value="ENTRY_LEVEL">Entry Level</option>
                  <option value="ONE_TO_TWO_YEARS">1–2 Years</option>
                  <option value="THREE_TO_FIVE_YEARS">3–5 Years</option>
                  <option value="FIVE_PLUS_YEARS">5+ Years</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-location">Job Location Display</Label>
                <Input
                  id="job-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Chennai, India or Remote"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-city">City</Label>
                <Input
                  id="job-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Chennai"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="job-state">State</Label>
                  <Input
                    id="job-state"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder="Tamil Nadu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job-country">Country</Label>
                  <Input
                    id="job-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>2. Job Description</CardTitle>
              <CardDescription>
                Structured role overview, responsibilities, qualifications, and perks (rich-text sanitized on save)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="job-summary">Job Summary</Label>
                <Input
                  id="job-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Concise 1–2 sentence elevator pitch for candidate search cards"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-description">Detailed Job Description *</Label>
                <RichTextEditor
                  id="job-description"
                  ariaLabel="Detailed Job Description"
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the team mission, technical challenges, and day-to-day impact (min 30 chars to publish)..."
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="job-responsibilities">Key Responsibilities</Label>
                  <RichTextEditor
                    id="job-responsibilities"
                    ariaLabel="Key Responsibilities"
                    value={responsibilities}
                    onChange={setResponsibilities}
                    minHeightClass="min-h-[120px]"
                    placeholder="Use bullet points to outline core responsibilities..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-req-qual">Required Qualifications</Label>
                  <RichTextEditor
                    id="job-req-qual"
                    ariaLabel="Required Qualifications"
                    value={requiredQualifications}
                    onChange={setRequiredQualifications}
                    minHeightClass="min-h-[120px]"
                    placeholder="Must-have experience, degrees, or technical depth..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-pref-qual">Preferred Qualifications</Label>
                  <RichTextEditor
                    id="job-pref-qual"
                    ariaLabel="Preferred Qualifications"
                    value={preferredQualifications}
                    onChange={setPreferredQualifications}
                    minHeightClass="min-h-[110px]"
                    placeholder="Nice-to-have skills or domain background..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-benefits">Benefits &amp; Perks</Label>
                  <RichTextEditor
                    id="job-benefits"
                    ariaLabel="Benefits and Perks"
                    value={benefits}
                    onChange={setBenefits}
                    minHeightClass="min-h-[110px]"
                    placeholder="Health coverage, flexible hours, learning stipend..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Required Skills */}
          <Card>
            <CardHeader>
              <CardTitle>3. Required Skills *</CardTitle>
              <CardDescription>
                Add normalized skill tags candidates can search and filter by
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillTagInput skills={requiredSkills} onChange={setRequiredSkills} />
            </CardContent>
          </Card>

          {/* Section 4: Salary Information */}
          <Card>
            <CardHeader>
              <CardTitle>4. Salary Information</CardTitle>
              <CardDescription>
                Configure annual/monthly compensation range or mark as undisclosed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={salaryUndisclosed}
                  onChange={(e) => setSalaryUndisclosed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Salary undisclosed (do not display compensation figures)</span>
              </label>

              {!salaryUndisclosed && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="salary-currency">Currency</Label>
                    <select
                      id="salary-currency"
                      value={salaryCurrency}
                      onChange={(e) => setSalaryCurrency(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="salary-min">Minimum Salary</Label>
                    <Input
                      id="salary-min"
                      type="number"
                      min={0}
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="e.g., 800000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="salary-max">Maximum Salary</Label>
                    <Input
                      id="salary-max"
                      type="number"
                      min={0}
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      placeholder="e.g., 1600000"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Screening Questions */}
          <Card>
            <CardHeader>
              <CardTitle>5. Custom Screening Questions</CardTitle>
              <CardDescription>
                Add structured screening prompts visible to candidates (responses collected in Phase 4)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScreeningQuestionBuilder
                questions={screeningQuestions}
                onChange={setScreeningQuestions}
              />
            </CardContent>
          </Card>

          {/* Section 6: Final Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                6. Preview &amp; Publishing
              </CardTitle>
              <CardDescription>
                Verify all mandatory details before publishing live to the Candidate Job Explorer
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {requiredSkills.length} skill(s) • {screeningQuestions.length} screening question(s)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4" />
                  Preview Job
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => validateAndSubmit('DRAFT')}
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={mutation.isPending}
                  onClick={() => validateAndSubmit('PUBLISHED')}
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Publish Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

