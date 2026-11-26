'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  Filter,
  Loader2,
  MapPin,
  Radio,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { JobPreviewCard } from '@/components/jobs/JobPreviewCard';
import { QuickApplyModal } from '@/components/jobs/QuickApplyModal';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useJobStream } from '@/hooks/useJobStream';
import { CANDIDATE_NAV_ITEMS } from '@/lib/navigation';
import {
  cn,
  formatDate,
  formatEmploymentType,
  formatSalaryRange,
  formatWorkMode,
} from '@/lib/utils';
import { ApiClientError } from '@/services/api';
import { atsService } from '@/services/ats.service';
import { CandidateJobSearchParams, jobsService } from '@/services/jobs.service';
import {
  CandidateJobsResponse,
  EmploymentType,
  ExperienceLevel,
  Job,
  WorkMode,
} from '@/types';

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ONSITE', label: 'Onsite' },
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'ENTRY_LEVEL', label: 'Entry Level' },
  { value: 'ONE_TO_TWO_YEARS', label: '1–2 Years' },
  { value: 'THREE_TO_FIVE_YEARS', label: '3–5 Years' },
  { value: 'FIVE_PLUS_YEARS', label: '5+ Years' },
];

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Software Development',
  'Data Science',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
];

export default function CandidateJobsExplorerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { connected: sseConnected } = useJobStream(user?.role === 'CANDIDATE');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState<string[]>([]);
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string[]>([]);
  const [experienceLevelFilter, setExperienceLevelFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsMatch, setSkillsMatch] = useState<'ANY' | 'ALL'>('ANY');
  const [sort, setSort] = useState<
    'relevant' | 'newest' | 'oldest' | 'salary_asc' | 'salary_desc'
  >('relevant');
  const [page, setPage] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Hydrate initial filters from URL query parameters
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q') || '';
    setSearchInput(q);
    setDebouncedQ(q);
    if (sp.get('location')) setLocationFilter(sp.get('location') || '');
    if (sp.get('workMode')) setWorkModeFilter(sp.get('workMode')!.split(',').filter(Boolean));
    if (sp.get('employmentType'))
      setEmploymentTypeFilter(sp.get('employmentType')!.split(',').filter(Boolean));
    if (sp.get('experienceLevel'))
      setExperienceLevelFilter(sp.get('experienceLevel')!.split(',').filter(Boolean));
    if (sp.get('department')) setDepartmentFilter(sp.get('department') || '');
    if (sp.get('salaryMin')) setSalaryMin(sp.get('salaryMin') || '');
    if (sp.get('salaryMax')) setSalaryMax(sp.get('salaryMax') || '');
    if (sp.get('skills')) setSelectedSkills(sp.get('skills')!.split(',').filter(Boolean));
    if (sp.get('skillsMatch') === 'ALL') setSkillsMatch('ALL');
    const sortParam = sp.get('sort');
    if (
      sortParam &&
      ['relevant', 'newest', 'oldest', 'salary_asc', 'salary_desc'].includes(sortParam)
    ) {
      setSort(sortParam as typeof sort);
    }
    if (sp.get('jobId')) setSelectedJobId(sp.get('jobId'));
  }, []);

  // Debounce keyword input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync active filters to URL query parameters without reload
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set('q', debouncedQ);
    if (locationFilter) sp.set('location', locationFilter);
    if (workModeFilter.length) sp.set('workMode', workModeFilter.join(','));
    if (employmentTypeFilter.length) sp.set('employmentType', employmentTypeFilter.join(','));
    if (experienceLevelFilter.length) sp.set('experienceLevel', experienceLevelFilter.join(','));
    if (departmentFilter) sp.set('department', departmentFilter);
    if (salaryMin) sp.set('salaryMin', salaryMin);
    if (salaryMax) sp.set('salaryMax', salaryMax);
    if (selectedSkills.length) sp.set('skills', selectedSkills.join(','));
    if (skillsMatch === 'ALL') sp.set('skillsMatch', 'ALL');
    if (sort !== 'relevant') sp.set('sort', sort);
    if (selectedJobId) sp.set('jobId', selectedJobId);
    const qs = sp.toString();
    const nextUrl = qs ? `/candidate/jobs?${qs}` : '/candidate/jobs';
    window.history.replaceState(null, '', nextUrl);
  }, [
    debouncedQ,
    locationFilter,
    workModeFilter,
    employmentTypeFilter,
    experienceLevelFilter,
    departmentFilter,
    salaryMin,
    salaryMax,
    selectedSkills,
    skillsMatch,
    sort,
    selectedJobId,
  ]);

  const queryParams: CandidateJobSearchParams = useMemo(
    () => ({
      q: debouncedQ || undefined,
      location: locationFilter || undefined,
      workMode: workModeFilter,
      employmentType: employmentTypeFilter,
      experienceLevel: experienceLevelFilter,
      department: departmentFilter || undefined,
      salaryMin: salaryMin || undefined,
      salaryMax: salaryMax || undefined,
      skills: selectedSkills,
      skillsMatch,
      sort,
      page,
      limit: 20,
    }),
    [
      debouncedQ,
      locationFilter,
      workModeFilter,
      employmentTypeFilter,
      experienceLevelFilter,
      departmentFilter,
      salaryMin,
      salaryMax,
      selectedSkills,
      skillsMatch,
      sort,
      page,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['candidate-jobs', queryParams],
    queryFn: () => jobsService.searchCandidateJobs(queryParams),
    enabled: user?.role === 'CANDIDATE',
  });

  const { data: myAppsData } = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: () => atsService.listMyApplications(),
    enabled: user?.role === 'CANDIDATE',
  });

  const appliedJobIds = useMemo(
    () => new Set((myAppsData?.applications || []).map((a) => a.jobId)),
    [myAppsData?.applications],
  );

  // Auto-select first result or clear selection if job was paused/closed
  useEffect(() => {
    if (!data?.items) return;
    if (data.items.length === 0) {
      setSelectedJobId(null);
      return;
    }
    const stillVisible = selectedJobId && data.items.some((j) => j.id === selectedJobId);
    if (!stillVisible) {
      setSelectedJobId(data.items[0].id);
    }
  }, [data?.items, selectedJobId]);

  const selectedJob: Job | null = useMemo(() => {
    if (!data?.items || !selectedJobId) return null;
    return data.items.find((j) => j.id === selectedJobId) || null;
  }, [data?.items, selectedJobId]);

  // Optimistic bookmark toggle mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ jobId, isBookmarked }: { jobId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await jobsService.removeBookmark(jobId);
      } else {
        await jobsService.addBookmark(jobId);
      }
    },
    onMutate: async ({ jobId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['candidate-jobs'] });
      const previous = queryClient.getQueryData<CandidateJobsResponse>([
        'candidate-jobs',
        queryParams,
      ]);

      queryClient.setQueryData<CandidateJobsResponse>(['candidate-jobs', queryParams], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((j) =>
            j.id === jobId ? { ...j, isBookmarked: !isBookmarked } : j,
          ),
        };
      });

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['candidate-jobs', queryParams], context.previous);
      }
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to update bookmark');
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isBookmarked ? 'Removed from Saved Jobs' : 'Saved to your bookmarked jobs');
      void queryClient.invalidateQueries({ queryKey: ['candidate-bookmarks'] });
    },
  });

  const toggleMultiFilter = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    setPage(1);
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedQ('');
    setLocationFilter('');
    setWorkModeFilter([]);
    setEmploymentTypeFilter([]);
    setExperienceLevelFilter([]);
    setDepartmentFilter('');
    setSalaryMin('');
    setSalaryMax('');
    setSelectedSkills([]);
    setSkillsMatch('ANY');
    setSort('relevant');
    setPage(1);
  };

  const activeFilterCount =
    (locationFilter ? 1 : 0) +
    workModeFilter.length +
    employmentTypeFilter.length +
    experienceLevelFilter.length +
    (departmentFilter ? 1 : 0) +
    (salaryMin || salaryMax ? 1 : 0) +
    selectedSkills.length;

  const availableDepartments = useMemo(() => {
    const merged = new Set([...DEFAULT_DEPARTMENTS, ...(data?.facets.departments || [])]);
    return Array.from(merged).sort();
  }, [data?.facets.departments]);

  const availableSkills = useMemo(() => {
    const defaults = ['Python', 'Java', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'AWS'];
    const merged = new Set([...defaults, ...(data?.facets.skills || [])]);
    return Array.from(merged).sort();
  }, [data?.facets.skills]);

  return (
    <DashboardShell
      requiredRole="CANDIDATE"
      navItems={CANDIDATE_NAV_ITEMS}
      activeView="jobs"
      pageTitle="Explore Jobs"
    >
      {/* Top Search & Filter Control Header */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title, company, skill (e.g. Python, React, Chennai, Remote)..."
                className="pl-9 pr-9"
                aria-label="Search published jobs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedQ('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters((p) => !p)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <select
                aria-label="Sort job results"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="relevant">Most Relevant</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salary_asc">Salary: Low to High</option>
                <option value="salary_desc">Salary: High to Low</option>
              </select>

              <Badge variant={sseConnected ? 'emerald' : 'muted'} className="gap-1.5">
                <Radio className={`h-3 w-3 ${sseConnected ? 'animate-pulse' : ''}`} />
                {sseConnected ? 'Live Feed' : 'Synced'}
              </Badge>
            </div>
          </div>

          {/* Collapsible Multi-Filter Drawer */}
          {showFilters && (
            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Location</label>
                <Input
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Chennai, Bengaluru, Remote..."
                  list="job-locations-list"
                />
                <datalist id="job-locations-list">
                  <option value="Remote" />
                  <option value="Chennai" />
                  <option value="Bengaluru" />
                  <option value="Hyderabad" />
                  <option value="Mumbai" />
                  <option value="Delhi" />
                  <option value="Pune" />
                  {data?.facets.locations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Department</label>
                <select
                  aria-label="Filter by department"
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  <option value="">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Range */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Salary Range (excludes undisclosed salaries when set)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={salaryMin}
                    onChange={(e) => {
                      setSalaryMin(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Min salary (e.g. 500000)"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={salaryMax}
                    onChange={(e) => {
                      setSalaryMax(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Max salary (e.g. 2000000)"
                  />
                </div>
              </div>

              {/* Work Mode */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-600">Work Mode</span>
                <div className="flex flex-wrap gap-1.5">
                  {WORK_MODES.map((wm) => (
                    <button
                      key={wm.value}
                      type="button"
                      onClick={() => toggleMultiFilter(workModeFilter, setWorkModeFilter, wm.value)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        workModeFilter.includes(wm.value)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {wm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-600">Employment Type</span>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYMENT_TYPES.map((et) => (
                    <button
                      key={et.value}
                      type="button"
                      onClick={() =>
                        toggleMultiFilter(employmentTypeFilter, setEmploymentTypeFilter, et.value)
                      }
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        employmentTypeFilter.includes(et.value)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {et.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5 sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-600">Experience Level</span>
                <div className="flex flex-wrap gap-1.5">
                  {EXPERIENCE_LEVELS.map((el) => (
                    <button
                      key={el.value}
                      type="button"
                      onClick={() =>
                        toggleMultiFilter(experienceLevelFilter, setExperienceLevelFilter, el.value)
                      }
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        experienceLevelFilter.includes(el.value)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {el.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Multi-select + ANY/ALL */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Required Skills Filter
                  </span>
                  <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSkillsMatch('ANY')}
                      className={cn(
                        'rounded px-2 py-0.5 font-medium',
                        skillsMatch === 'ANY'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500',
                      )}
                    >
                      Match ANY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkillsMatch('ALL')}
                      className={cn(
                        'rounded px-2 py-0.5 font-medium',
                        skillsMatch === 'ALL'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500',
                      )}
                    >
                      Match ALL
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {availableSkills.map((sk) => (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => toggleMultiFilter(selectedSkills, setSelectedSkills, sk)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        selectedSkills.includes(sk)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {sk}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customSkillInput.trim()) {
                          e.preventDefault();
                          toggleMultiFilter(
                            selectedSkills,
                            setSelectedSkills,
                            customSkillInput.trim(),
                          );
                          setCustomSkillInput('');
                        }
                      }}
                      placeholder="Custom skill..."
                      className="h-7 w-32 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {(activeFilterCount > 0 || debouncedQ) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-medium text-slate-500">Active:</span>
              {debouncedQ && (
                <Badge variant="blue" className="gap-1">
                  Search: &quot;{debouncedQ}&quot;
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedQ('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {locationFilter && (
                <Badge variant="blue" className="gap-1">
                  Location: {locationFilter}
                  <button type="button" onClick={() => setLocationFilter('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {workModeFilter.map((wm) => (
                <Badge key={wm} variant="blue" className="gap-1">
                  {wm}
                  <button
                    type="button"
                    onClick={() => toggleMultiFilter(workModeFilter, setWorkModeFilter, wm)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {employmentTypeFilter.map((et) => (
                <Badge key={et} variant="blue" className="gap-1">
                  {formatEmploymentType(et as EmploymentType)}
                  <button
                    type="button"
                    onClick={() =>
                      toggleMultiFilter(employmentTypeFilter, setEmploymentTypeFilter, et)
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedSkills.map((sk) => (
                <Badge key={sk} variant="blue" className="gap-1">
                  Skill: {sk}
                  <button
                    type="button"
                    onClick={() => toggleMultiFilter(selectedSkills, setSelectedSkills, sk)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split-Pane Explorer */}
      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error instanceof Error ? error.message : 'Unable to load jobs.'}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT PANEL: Results List */}
          <div
            className={cn(
              'space-y-3 lg:col-span-5',
              mobileShowDetail ? 'hidden lg:block' : 'block',
            )}
          >
            <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500">
              <span>
                {isLoading
                  ? 'Searching published roles...'
                  : `${data?.pagination.total ?? 0} published job(s) found`}
              </span>
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating...
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="No published jobs match your search"
                description="Try clearing a filter or searching by another skill, location, or role title."
              />
            ) : (
              <div className="space-y-3">
                {data.items.map((job) => {
                  const isSelected = job.id === selectedJob?.id;
                  return (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setMobileShowDetail(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedJobId(job.id);
                          setMobileShowDetail(true);
                        }
                      }}
                      className={cn(
                        'cursor-pointer rounded-xl border bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm',
                        isSelected
                          ? 'border-blue-600 ring-1 ring-blue-600 shadow-sm'
                          : 'border-slate-200',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {job.title}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{job.company}</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            bookmarkMutation.mutate({
                              jobId: job.id,
                              isBookmarked: Boolean(job.isBookmarked),
                            });
                          }}
                          aria-label={job.isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            job.isBookmarked
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
                          )}
                        >
                          <Bookmark
                            className={`h-4 w-4 ${job.isBookmarked ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="blue">{formatWorkMode(job.workMode)}</Badge>
                        <Badge variant="default">{formatEmploymentType(job.employmentType)}</Badge>
                        <Badge variant="muted">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {formatSalaryRange({
                            salaryMin: job.salaryMin,
                            salaryMax: job.salaryMax,
                            salaryCurrency: job.salaryCurrency,
                            salaryUndisclosed: job.salaryUndisclosed,
                          })}
                        </span>
                        {job.publishedAt && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(job.publishedAt)}
                          </span>
                        )}
                      </div>

                      {job.requiredSkills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {job.requiredSkills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.requiredSkills.length > 4 && (
                            <span className="px-1 text-[11px] text-slate-400">
                              +{job.requiredSkills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                    <span>
                      Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Selected Job Details */}
          <div
            className={cn(
              'lg:col-span-7',
              mobileShowDetail ? 'block' : 'hidden lg:block',
            )}
          >
            {selectedJob ? (
              <Card className="lg:sticky lg:top-20">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 lg:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileShowDetail(false)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to job results
                    </Button>
                  </div>
                  <JobPreviewCard
                    job={selectedJob}
                    bookmarkPending={bookmarkMutation.isPending}
                    hasApplied={appliedJobIds.has(selectedJob.id)}
                    onApplyClick={() => setApplyModalOpen(true)}
                    onToggleBookmark={() =>
                      bookmarkMutation.mutate({
                        jobId: selectedJob.id,
                        isBookmarked: Boolean(selectedJob.isBookmarked),
                      })
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="Select a job to inspect details"
                description="Click any job card on the left to review full responsibilities, required skills, compensation, and screening questions."
              />
            )}
          </div>
        </div>
      )}

      <QuickApplyModal
        job={selectedJob}
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
      />
    </DashboardShell>
  );
}

