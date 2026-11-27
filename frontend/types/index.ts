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

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type ParseStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type InterviewStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'RESCHEDULE_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type CandidateInterviewResponse =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED';
export type CompanyVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

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
    upcomingInterviewsCount?: number;
    unreadNotificationsCount?: number;
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
    unreadNotificationsCount?: number;
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

export interface ParsedResumeData {
  parserVersion: string;
  wordCount: number;
  extractedAt: string;
  contact: {
    email: string | null;
    phone: string | null;
    location?: string | null;
    links: string[];
  };
  summary?: string;
  skills: Array<{
    name: string;
    normalizedKey: string;
    evidenceSnippet: string;
    confidence: number;
  }>;
  experience: {
    estimatedYears: number | null;
    uncertain: boolean;
    highlights: string[];
  };
  education: string[];
  rawTextPreview: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  title: string;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  skills: string[];
  parsedJson: ParsedResumeData | null;
  isDefault: boolean;
  version: number;
  parseStatus: ParseStatus;
  parseError: string | null;
  parserVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScoreBreakdown {
  scoringVersion: string;
  totalScore: number;
  requiredSkillCoverage: {
    score: number;
    maxScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  experienceAlignment: {
    score: number;
    maxScore: number;
    status: string;
  };
  profileAndKeywords: {
    score: number;
    maxScore: number;
    note: string;
  };
  educationAndStructure: {
    score: number;
    maxScore: number;
    note: string;
  };
}

export interface ResumeReadinessResponse {
  job: {
    id: string;
    title: string;
    company: string;
    requiredSkills: string[];
  };
  resume: {
    id: string;
    title: string;
    version: number;
    skills: string[];
  };
  readiness: MatchScoreBreakdown;
  disclaimer: string;
}

export interface ApplicationEventItem {
  id: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  eventType: string;
  publicNote: string | null;
  internalNote?: string | null;
  occurredAt: string;
  actor?: {
    id: string;
    fullName: string;
    role: UserRole;
  } | null;
}

export interface InterviewRecord {
  id: string;
  applicationId: string;
  roundTitle: string;
  interviewType: string;
  startAt: string;
  endAt: string;
  timezone: string;
  meetingUrl: string | null;
  location: string | null;
  instructions: string | null;
  status: InterviewStatus;
  candidateResponse: CandidateInterviewResponse;
  candidateNote?: string | null;
  respondedAt: string | null;
  application?: {
    id: string;
    stage: ApplicationStage;
    matchScore?: number | null;
    candidate?: { id: string; fullName: string; email: string };
    job?: { id: string; title: string; company: string; location?: string; workMode?: WorkMode };
  };
}

export interface EvaluationRecord {
  id: string;
  applicationId: string;
  interviewId?: string | null;
  rating: number | null;
  recommendation?: string | null;
  notes: string | null;
  criteria?: {
    technicalSkills: number;
    problemSolving: number;
    communication: number;
    roleFit: number;
  } | null;
  isCandidateVisible?: boolean;
  submittedAt: string;
  reviewer?: { id: string; fullName: string };
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string | null;
  resumeSnapshot: {
    resumeId: string;
    title: string;
    version: number;
    fileName?: string | null;
    skills: string[];
    parsedJson?: ParsedResumeData | null;
    capturedAt: string;
  } | null;
  matchScore: number | null;
  scoreBreakdown: MatchScoreBreakdown | null;
  screeningAnswers: Array<{
    questionId: string;
    questionTitle: string;
    answer: string | boolean | string[];
  }> | null;
  coverNote: string | null;
  stage: ApplicationStage;
  appliedAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    company: string;
    location?: string;
    workMode?: WorkMode;
    employmentType?: EmploymentType;
    status?: JobStatus;
  };
  candidate?: {
    id: string;
    fullName: string;
    email: string;
  };
  events?: ApplicationEventItem[];
  interviews?: InterviewRecord[];
  evaluations?: EvaluationRecord[];
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  ownerId: string;
  legalName: string;
  displayName: string;
  website: string | null;
  industry: string | null;
  sizeBand: string | null;
  headquarters: string | null;
  description: string | null;
  verificationStatus: CompanyVerificationStatus;
  verifiedAt: string | null;
  verificationReason: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; email: string };
  verifiedBy?: { id: string; fullName: string } | null;
}

export interface FunnelAnalytics {
  scope: 'PLATFORM' | 'RECRUITER';
  generatedAt: string;
  totals: {
    totalJobs: number;
    publishedJobs: number;
    pausedJobs: number;
    closedJobs: number;
    totalApplications: number;
    interviewsCount: number;
    averageMatchScore: number | null;
    timeToHireDaysAvg?: number | null;
    jobFillRatePct?: number;
  };
  stageBreakdown: Record<ApplicationStage, number>;
  conversions: {
    appliedToScreeningPct: number;
    appliedToInterviewPct: number;
    appliedToOfferPct: number;
    rejectionRatePct: number;
  };
  topJobs: Array<{
    id: string;
    title: string;
    company: string;
    status: JobStatus;
    applicantsCount: number;
  }>;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface UserProfileRecord {
  id: string;
  userId: string;
  headline: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  experienceSummary: string | null;
  education: string | null;
  skills: string[];
  portfolioUrl: string | null;
  profileVisible: boolean;
  emailNotifications: boolean;
  interviewReminders: boolean;
  marketingUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  isCurrent: boolean;
  isActive: boolean;
}

export interface NotificationPreferencesRecord {
  emailNotifications: boolean;
  interviewReminders: boolean;
  marketingUpdates: boolean;
  profileVisible: boolean;
}

export interface RetentionJobRecord {
  id: string;
  subjectType: string;
  subjectId: string;
  policyKey: string;
  status: 'SCHEDULED' | 'ON_HOLD' | 'EXECUTED' | 'FAILED';
  scheduledAt: string;
  executedAt: string | null;
  result: string | null;
  holdReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemDiagnosticsRecord {
  checkedAt: string;
  environment: string;
  deploymentPlatform: string;
  api: { status: string; nodeVersion: string; uptimeSeconds: number };
  database: { status: string; latencyMs: number; pooledRuntimeEnabled: boolean };
  storage: { provider: string; accessMode: string; configured: boolean };
  eventsAndQueues: {
    transport: string;
    outboxTotalCount: number;
    outboxPendingCount: number;
    resumeParseFailuresCount: number;
  };
  security: {
    activeSessionsCount: number;
    cookieSecureFlag: boolean;
    emailProviderMode: string;
  };
}
