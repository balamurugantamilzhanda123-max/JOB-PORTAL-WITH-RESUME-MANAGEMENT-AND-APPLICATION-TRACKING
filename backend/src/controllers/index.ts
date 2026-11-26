export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type ExperienceLevel =
    | 'FRESHER'
    | 'ENTRY_LEVEL'
    | 'ONE_TO_TWO_YEARS'
    | 'THREE_TO_FIVE_YEARS'
    | 'FIVE_PLUS_YEARS';
export type QuestionType = 'SHORT_TEXT' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export interface User {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ApiSuccessResponse<T> {
    success: true;
    message: string;
    data: T;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    error?: {
        code: string;
        details?: Record<string, string[]>;
    };
}

export interface PhaseRoadmapItem {
    available: boolean;
    targetPhase: string;
    label: string;
}

export interface CandidateDashboardData {
    user: User;
    summary: {
        profileCompletionPercent: number;
        resumeCount: number;
        applicationCount: number;
        bookmarkedJobsCount?: number;
        publishedJobsCount?: number;
        accountStatus: string;
    };
    phaseRoadmap: Record<string, PhaseRoadmapItem>;
    recentActivity: unknown[];
}

export interface RecruiterDashboardData {
    user: User;
    summary: {
        activeJobsCount: number;
        totalJobsCount?: number;
        totalApplicantsCount: number;
        scheduledInterviewsCount: number;
        accountStatus: string;
    };
    phaseRoadmap: Record<string, PhaseRoadmapItem>;
    recentActivity: unknown[];
}

export interface AdminUserStats {
    totalUsers: number;
    candidateCount: number;
    recruiterCount: number;
    adminCount: number;
    activeUsersCount: number;
    inactiveUsersCount: number;
    activeSessionsCount: number;
}

export interface AdminDashboardData {
    user: User;
    stats: AdminUserStats;
    system: {
        status: string;
        database: string;
        databaseLatencyMs: number;
        environment: string;
        nodeVersion: string;
        uptimeSeconds: number;
    };
    phaseRoadmap: Record<string, PhaseRoadmapItem>;
    recentActivity: unknown[];
}

export interface JobScreeningQuestion {
    id?: string;
    title: string;
    questionType: QuestionType;
    isRequired: boolean;
    options: string[];
    orderIndex?: number;
}

export interface JobAuditLogItem {
    id: string;
    previousStatus: JobStatus | null;
    newStatus: JobStatus;
    reason: string | null;
    createdAt: string;
    actor?: {
        id: string;
        fullName: string;
        email: string;
    };
}

export interface Job {
    id: string;
    recruiterId: string;
    company: string;
    title: string;
    department: string;
    location: string;
    country: string | null;
    state: string | null;
    city: string | null;
    workMode: WorkMode;
    employmentType: EmploymentType;
    experienceLevel: ExperienceLevel;
    summary: string | null;
    description: string;
    responsibilities: string | null;
    requiredQualifications: string | null;
    preferredQualifications: string | null;
    benefits: string | null;
    requiredSkills: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    salaryUndisclosed: boolean;
    status: JobStatus;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    screeningQuestions?: JobScreeningQuestion[];
    auditLogs?: JobAuditLogItem[];
    isBookmarked?: boolean;
    _count?: {
        screeningQuestions: number;
    };
}

export interface RecruiterJobStats {
    totalJobs: number;
    publishedJobs: number;
    draftJobs: number;
    pausedJobs: number;
    closedJobs: number;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface RecruiterJobsResponse {
    items: Job[];
    stats: RecruiterJobStats;
    pagination: PaginationMeta;
}

export interface CandidateJobsResponse {
    items: Job[];
    facets: {
        locations: string[];
        departments: string[];
        skills: string[];
    };
    pagination: PaginationMeta;
}

export interface SavedJobItem {
    bookmarkId: string;
    savedAt: string;
    isUnavailable: boolean;
    job: Job;
}
