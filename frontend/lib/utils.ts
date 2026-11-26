import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  QuestionType,
  UserRole,
  WorkMode,
} from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDashboardRouteForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'RECRUITER':
      return '/recruiter/dashboard';
    case 'CANDIDATE':
    default:
      return '/candidate/dashboard';
  }
}

export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'RECRUITER':
      return 'Recruiter / Hiring Manager';
    case 'CANDIDATE':
      return 'Candidate';
  }
}

export function formatWorkMode(mode: WorkMode): string {
  switch (mode) {
    case 'REMOTE':
      return 'Remote';
    case 'HYBRID':
      return 'Hybrid';
    case 'ONSITE':
      return 'Onsite';
  }
}

export function formatEmploymentType(type: EmploymentType): string {
  switch (type) {
    case 'FULL_TIME':
      return 'Full-time';
    case 'PART_TIME':
      return 'Part-time';
    case 'CONTRACT':
      return 'Contract';
    case 'INTERNSHIP':
      return 'Internship';
  }
}

export function formatExperienceLevel(level: ExperienceLevel): string {
  switch (level) {
    case 'FRESHER':
      return 'Fresher';
    case 'ENTRY_LEVEL':
      return 'Entry Level';
    case 'ONE_TO_TWO_YEARS':
      return '1–2 Years';
    case 'THREE_TO_FIVE_YEARS':
      return '3–5 Years';
    case 'FIVE_PLUS_YEARS':
      return '5+ Years';
  }
}

export function formatQuestionType(type: QuestionType): string {
  switch (type) {
    case 'SHORT_TEXT':
      return 'Short Text';
    case 'YES_NO':
      return 'Yes / No';
    case 'SINGLE_CHOICE':
      return 'Single Choice';
    case 'MULTIPLE_CHOICE':
      return 'Multiple Choice';
  }
}

export function getJobStatusBadgeVariant(
  status: JobStatus,
): 'emerald' | 'amber' | 'red' | 'default' {
  switch (status) {
    case 'PUBLISHED':
      return 'emerald';
    case 'PAUSED':
      return 'amber';
    case 'CLOSED':
      return 'red';
    case 'DRAFT':
    default:
      return 'default';
  }
}

export function formatSalaryRange(params: {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryUndisclosed: boolean;
}): string {
  if (params.salaryUndisclosed || (params.salaryMin == null && params.salaryMax == null)) {
    return 'Salary undisclosed';
  }
  const currency = params.salaryCurrency || 'INR';
  const fmt = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  if (params.salaryMin != null && params.salaryMax != null) {
    return `${fmt.format(params.salaryMin)} – ${fmt.format(params.salaryMax)}`;
  }
  if (params.salaryMin != null) {
    return `From ${fmt.format(params.salaryMin)}`;
  }
  return `Up to ${fmt.format(params.salaryMax!)}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
