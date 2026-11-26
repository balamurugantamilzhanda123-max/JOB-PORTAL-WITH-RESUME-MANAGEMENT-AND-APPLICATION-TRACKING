import {
  CandidateJobsResponse,
  EmploymentType,
  ExperienceLevel,
  Job,
  JobScreeningQuestion,
  JobStatus,
  RecruiterJobsResponse,
  RecruiterJobStats,
  SavedJobItem,
  WorkMode,
} from '@/types';
import { apiRequest } from './api';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface JobUpsertPayload {
  title: string;
  company: string;
  department: string;
  location: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
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
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency: string;
  salaryUndisclosed: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  screeningQuestions: JobScreeningQuestion[];
}

export interface RecruiterJobsFilterParams {
  q?: string;
  status?: JobStatus | '';
  workMode?: WorkMode | '';
  location?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface CandidateJobSearchParams {
  q?: string;
  location?: string;
  workMode?: string[];
  employmentType?: string[];
  experienceLevel?: string[];
  department?: string;
  salaryMin?: string;
  salaryMax?: string;
  skills?: string[];
  skillsMatch?: 'ANY' | 'ALL';
  sort?: 'relevant' | 'newest' | 'oldest' | 'salary_asc' | 'salary_desc';
  page?: number;
  limit?: number;
}

export const jobsService = {
  getRecruiterStats(): Promise<RecruiterJobStats> {
    return apiRequest<RecruiterJobStats>('/recruiter/jobs/stats');
  },

  listRecruiterJobs(params: RecruiterJobsFilterParams): Promise<RecruiterJobsResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    if (params.workMode) qs.set('workMode', params.workMode);
    if (params.location) qs.set('location', params.location);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiRequest<RecruiterJobsResponse>(`/recruiter/jobs${query ? `?${query}` : ''}`);
  },

  getRecruiterJob(id: string): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>(`/recruiter/jobs/${id}`);
  },

  createRecruiterJob(payload: JobUpsertPayload): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>('/recruiter/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRecruiterJob(id: string, payload: JobUpsertPayload): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>(`/recruiter/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  transitionJobStatus(id: string, status: JobStatus, reason?: string): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>(`/recruiter/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  searchCandidateJobs(params: CandidateJobSearchParams): Promise<CandidateJobsResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.location) qs.set('location', params.location);
    if (params.workMode?.length) qs.set('workMode', params.workMode.join(','));
    if (params.employmentType?.length) qs.set('employmentType', params.employmentType.join(','));
    if (params.experienceLevel?.length) qs.set('experienceLevel', params.experienceLevel.join(','));
    if (params.department) qs.set('department', params.department);
    if (params.salaryMin) qs.set('salaryMin', params.salaryMin);
    if (params.salaryMax) qs.set('salaryMax', params.salaryMax);
    if (params.skills?.length) qs.set('skills', params.skills.join(','));
    if (params.skillsMatch) qs.set('skillsMatch', params.skillsMatch);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiRequest<CandidateJobsResponse>(`/candidate/jobs${query ? `?${query}` : ''}`);
  },

  getCandidateJob(id: string): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>(`/candidate/jobs/${id}`);
  },

  listSavedJobs(): Promise<{ bookmarks: SavedJobItem[] }> {
    return apiRequest<{ bookmarks: SavedJobItem[] }>('/candidate/bookmarks');
  },

  addBookmark(jobId: string): Promise<{ bookmark: { id: string } }> {
    return apiRequest<{ bookmark: { id: string } }>(`/candidate/bookmarks/${jobId}`, {
      method: 'POST',
    });
  },

  removeBookmark(jobId: string): Promise<null> {
    return apiRequest<null>(`/candidate/bookmarks/${jobId}`, {
      method: 'DELETE',
    });
  },
};

