import {
  ApplicationRecord,
  ApplicationStage,
  AuditLogRecord,
  CandidateJobsResponse,
  CompanyProfile,
  CompanyVerificationStatus,
  EvaluationRecord,
  FunnelAnalytics,
  InterviewRecord,
  Job,
  NotificationPreferencesRecord,
  NotificationRecord,
  ResumeReadinessResponse,
  ResumeRecord,
  RetentionJobRecord,
  SystemDiagnosticsRecord,
} from '@/types';
import { apiRequest } from './api';
import { API_BASE_URL, CandidateJobSearchParams } from './jobs.service';

export const atsService = {
  // Public Jobs
  searchPublicJobs(params: CandidateJobSearchParams): Promise<CandidateJobsResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.location) qs.set('location', params.location);
    if (params.workMode?.length) qs.set('workMode', params.workMode.join(','));
    if (params.employmentType?.length) qs.set('employmentType', params.employmentType.join(','));
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiRequest<CandidateJobsResponse>(`/public/jobs${query ? `?${query}` : ''}`);
  },

  getPublicJobDetail(id: string): Promise<{ job: Job }> {
    return apiRequest<{ job: Job }>(`/public/jobs/${id}`);
  },

  // Phase 3: Resumes
  listResumes(): Promise<{ resumes: ResumeRecord[] }> {
    return apiRequest<{ resumes: ResumeRecord[] }>('/candidate/resumes');
  },

  getResumeDetail(id: string): Promise<{ resume: ResumeRecord }> {
    return apiRequest<{ resume: ResumeRecord }>(`/candidate/resumes/${id}`);
  },

  updateResume(
    id: string,
    payload: {
      title?: string;
      skills?: string[];
      summary?: string;
      email?: string;
      phone?: string;
      location?: string;
    },
  ): Promise<{ resume: ResumeRecord }> {
    return apiRequest<{ resume: ResumeRecord }>(`/candidate/resumes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  uploadResume(formData: FormData): Promise<{ resume: ResumeRecord }> {
    return apiRequest<{ resume: ResumeRecord }>('/candidate/resumes/upload', {
      method: 'POST',
      body: formData,
    });
  },

  setDefaultResume(id: string): Promise<{ resume: ResumeRecord }> {
    return apiRequest<{ resume: ResumeRecord }>(`/candidate/resumes/${id}/set-default`, {
      method: 'POST',
    });
  },

  reparseResume(id: string): Promise<{ resume: ResumeRecord }> {
    return apiRequest<{ resume: ResumeRecord }>(`/candidate/resumes/${id}/reparse`, {
      method: 'POST',
    });
  },

  deleteResume(id: string): Promise<null> {
    return apiRequest<null>(`/candidate/resumes/${id}`, {
      method: 'DELETE',
    });
  },

  getResumeReadiness(jobId: string, resumeId?: string): Promise<ResumeReadinessResponse> {
    const qs = resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : '';
    return apiRequest<ResumeReadinessResponse>(
      `/candidate/jobs/${jobId}/resume-readiness${qs}`,
    );
  },

  getResumeDownloadUrl(resumeId: string): string {
    return `${API_BASE_URL}/resumes/${resumeId}/download`;
  },

  // Phase 4: Applications & ATS Pipeline
  submitApplication(
    jobId: string,
    payload: {
      resumeId: string;
      coverNote?: string;
      idempotencyKey?: string;
      screeningAnswers?: Array<{
        questionId: string;
        answer: string | boolean | string[];
      }>;
    },
  ): Promise<{ application: ApplicationRecord }> {
    return apiRequest<{ application: ApplicationRecord }>(
      `/candidate/jobs/${jobId}/applications`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  listMyApplications(): Promise<{ applications: ApplicationRecord[] }> {
    return apiRequest<{ applications: ApplicationRecord[] }>('/candidate/applications');
  },

  getMyApplicationDetail(id: string): Promise<{ application: ApplicationRecord }> {
    return apiRequest<{ application: ApplicationRecord }>(`/candidate/applications/${id}`);
  },

  getRecruiterApplicationDetail(id: string): Promise<{ application: ApplicationRecord }> {
    return apiRequest<{ application: ApplicationRecord }>(`/recruiter/applications/${id}`);
  },

  listEvaluationsForApplication(applicationId: string): Promise<{ evaluations: EvaluationRecord[] }> {
    return apiRequest<{ evaluations: EvaluationRecord[] }>(
      `/recruiter/applications/${applicationId}/evaluations`,
    );
  },

  listJobApplicants(jobId: string): Promise<{
    job: {
      id: string;
      title: string;
      company: string;
      location: string;
      workMode: string;
      status: string;
      requiredSkills: string[];
    };
    applications: ApplicationRecord[];
  }> {
    return apiRequest(`/recruiter/jobs/${jobId}/applicants`);
  },

  getRecruiterPipeline(): Promise<{ applications: ApplicationRecord[] }> {
    return apiRequest<{ applications: ApplicationRecord[] }>('/recruiter/pipeline');
  },

  transitionApplicationStage(
    applicationId: string,
    payload: {
      stage: ApplicationStage;
      publicNote?: string;
      internalNote?: string;
    },
  ): Promise<{ application: ApplicationRecord }> {
    return apiRequest<{ application: ApplicationRecord }>(
      `/recruiter/applications/${applicationId}/stage`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  // Phase 5: Interviews, Evaluations & Notifications
  proposeInterview(
    applicationId: string,
    payload: {
      roundTitle: string;
      interviewType: string;
      startAt: string;
      endAt: string;
      timezone: string;
      meetingUrl?: string;
      location?: string;
      instructions?: string;
    },
  ): Promise<{ interview: InterviewRecord }> {
    return apiRequest<{ interview: InterviewRecord }>(
      `/recruiter/applications/${applicationId}/interviews`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  listCandidateInterviews(): Promise<{ interviews: InterviewRecord[] }> {
    return apiRequest<{ interviews: InterviewRecord[] }>('/candidate/interviews');
  },

  respondToInterview(
    interviewId: string,
    payload: {
      response: 'ACCEPTED' | 'DECLINED' | 'RESCHEDULE_REQUESTED';
      note?: string;
    },
  ): Promise<{ interview: InterviewRecord }> {
    return apiRequest<{ interview: InterviewRecord }>(
      `/candidate/interviews/${interviewId}/respond`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  listRecruiterInterviews(): Promise<{ interviews: InterviewRecord[] }> {
    return apiRequest<{ interviews: InterviewRecord[] }>('/recruiter/interviews');
  },

  submitEvaluation(
    applicationId: string,
    payload: {
      interviewId?: string | null;
      rating: number;
      recommendation: 'STRONG_NO' | 'NO' | 'MIXED' | 'YES' | 'STRONG_YES';
      notes: string;
      isCandidateVisible?: boolean;
      criteria?: {
        technicalSkills: number;
        problemSolving: number;
        communication: number;
        roleFit: number;
      };
    },
  ): Promise<{ evaluation: EvaluationRecord }> {
    return apiRequest<{ evaluation: EvaluationRecord }>(
      `/recruiter/applications/${applicationId}/evaluations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  listNotifications(): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
    return apiRequest<{ items: NotificationRecord[]; unreadCount: number }>('/notifications');
  },

  markNotificationRead(id: string): Promise<{ notification: NotificationRecord }> {
    return apiRequest<{ notification: NotificationRecord }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllNotificationsRead(): Promise<null> {
    return apiRequest<null>('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  // Phase 6: Analytics, Company Verification & Audit Logs
  getFunnelAnalytics(): Promise<FunnelAnalytics> {
    return apiRequest<FunnelAnalytics>('/analytics/funnel');
  },

  getRecruiterCompany(): Promise<{ company: CompanyProfile | null }> {
    return apiRequest<{ company: CompanyProfile | null }>('/recruiter/company');
  },

  upsertRecruiterCompany(payload: {
    legalName: string;
    displayName: string;
    website?: string;
    industry?: string;
    sizeBand?: string;
    headquarters?: string;
    description?: string;
  }): Promise<{ company: CompanyProfile }> {
    return apiRequest<{ company: CompanyProfile }>('/recruiter/company', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  adminListCompanies(status?: CompanyVerificationStatus): Promise<{ companies: CompanyProfile[] }> {
    const qs = status ? `?status=${status}` : '';
    return apiRequest<{ companies: CompanyProfile[] }>(`/admin/companies${qs}`);
  },

  adminVerifyCompany(
    companyId: string,
    payload: { status: CompanyVerificationStatus; reason: string },
  ): Promise<{ company: CompanyProfile }> {
    return apiRequest<{ company: CompanyProfile }>(`/admin/companies/${companyId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  adminListAuditLogs(): Promise<{ logs: AuditLogRecord[] }> {
    return apiRequest<{ logs: AuditLogRecord[] }>('/admin/audit-logs');
  },

  getNotificationPreferences(): Promise<{ preferences: NotificationPreferencesRecord }> {
    return apiRequest<{ preferences: NotificationPreferencesRecord }>('/notifications/preferences');
  },

  updateNotificationPreferences(
    payload: Partial<NotificationPreferencesRecord>,
  ): Promise<{ preferences: NotificationPreferencesRecord }> {
    return apiRequest<{ preferences: NotificationPreferencesRecord }>(
      '/notifications/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  adminRevokeUserSessions(userId: string, reason: string): Promise<{ revokedCount: number }> {
    return apiRequest<{ revokedCount: number }>(`/admin/users/${userId}/revoke-sessions`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  adminListRetention(): Promise<{ jobs: RetentionJobRecord[] }> {
    return apiRequest<{ jobs: RetentionJobRecord[] }>('/admin/retention');
  },

  adminCreateRetention(payload: {
    subjectType: 'CandidateProfile' | 'Resume' | 'Application' | 'AuthSession';
    subjectId: string;
    policyKey: string;
    scheduledAt?: string;
    holdReason?: string;
  }): Promise<{ job: RetentionJobRecord }> {
    return apiRequest<{ job: RetentionJobRecord }>('/admin/retention', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  adminToggleRetentionHold(
    id: string,
    payload: { hold: boolean; holdReason?: string },
  ): Promise<{ job: RetentionJobRecord }> {
    return apiRequest<{ job: RetentionJobRecord }>(`/admin/retention/${id}/hold`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  adminExecuteRetention(id: string): Promise<{ job: RetentionJobRecord }> {
    return apiRequest<{ job: RetentionJobRecord }>(`/admin/retention/${id}/execute`, {
      method: 'POST',
    });
  },

  adminGetSystemHealth(): Promise<SystemDiagnosticsRecord> {
    return apiRequest<SystemDiagnosticsRecord>('/admin/system');
  },
};

