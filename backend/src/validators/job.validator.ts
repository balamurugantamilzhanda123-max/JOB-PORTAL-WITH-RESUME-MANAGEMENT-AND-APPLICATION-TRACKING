import {
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  QuestionType,
  WorkMode,
} from '@prisma/client';
import { z } from 'zod';
import { stripHtmlToPlainText } from '../utils/sanitize';

export const screeningQuestionSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z
      .string({ required_error: 'Question title is required' })
      .trim()
      .min(3, 'Question title must be at least 3 characters')
      .max(500, 'Question title cannot exceed 500 characters'),
    questionType: z.nativeEnum(QuestionType),
    isRequired: z.boolean().default(true),
    options: z.array(z.string().trim().min(1)).default([]),
    orderIndex: z.number().int().min(0).optional(),
  })
  .superRefine((q, ctx) => {
    if (
      (q.questionType === QuestionType.SINGLE_CHOICE ||
        q.questionType === QuestionType.MULTIPLE_CHOICE) &&
      q.options.length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choice questions require at least 2 options',
        path: ['options'],
      });
    }
  });

export const jobPayloadSchema = z
  .object({
    title: z
      .string({ required_error: 'Job title is required' })
      .trim()
      .min(2, 'Job title must be at least 2 characters')
      .max(200, 'Job title cannot exceed 200 characters'),
    company: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(200, 'Company name cannot exceed 200 characters'),
    department: z
      .string({ required_error: 'Department is required' })
      .trim()
      .min(2, 'Department is required')
      .max(120, 'Department cannot exceed 120 characters'),
    location: z.string().trim().max(200).optional().default(''),
    country: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    workMode: z.nativeEnum(WorkMode, {
      required_error: 'Work mode is required',
    }),
    employmentType: z.nativeEnum(EmploymentType, {
      required_error: 'Employment type is required',
    }),
    experienceLevel: z.nativeEnum(ExperienceLevel).default(ExperienceLevel.ENTRY_LEVEL),
    summary: z.string().max(4000).optional().nullable(),
    description: z.string().max(30000).optional().default(''),
    responsibilities: z.string().max(15000).optional().nullable(),
    requiredQualifications: z.string().max(15000).optional().nullable(),
    preferredQualifications: z.string().max(15000).optional().nullable(),
    benefits: z.string().max(10000).optional().nullable(),
    requiredSkills: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
    salaryMin: z.number().int().min(0, 'Minimum salary cannot be negative').nullable().optional(),
    salaryMax: z.number().int().min(0, 'Maximum salary cannot be negative').nullable().optional(),
    salaryCurrency: z.string().trim().min(3).max(10).default('INR'),
    salaryUndisclosed: z.boolean().default(false),
    status: z.enum([JobStatus.DRAFT, JobStatus.PUBLISHED]).optional().default(JobStatus.DRAFT),
    screeningQuestions: z.array(screeningQuestionSchema).max(30).default([]),
  })
  .superRefine((data, ctx) => {
    if (
      !data.salaryUndisclosed &&
      data.salaryMin != null &&
      data.salaryMax != null &&
      data.salaryMin > data.salaryMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary cannot exceed maximum salary',
        path: ['salaryMin'],
      });
    }

    if (data.status === JobStatus.PUBLISHED) {
      const plainDesc = stripHtmlToPlainText(data.description);
      if (plainDesc.length < 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Detailed job description must be at least 30 characters before publishing',
          path: ['description'],
        });
      }

      if (data.requiredSkills.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one required skill must be added before publishing',
          path: ['requiredSkills'],
        });
      }

      const resolvedLocation =
        data.location?.trim() ||
        [data.city, data.state, data.country].filter(Boolean).join(', ');
      if (data.workMode !== WorkMode.REMOTE && !resolvedLocation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Location is required for Hybrid and Onsite roles',
          path: ['location'],
        });
      }
    }
  });

export const updateJobStatusSchema = z.object({
  status: z.nativeEnum(JobStatus, {
    required_error: 'Target status is required',
  }),
  reason: z.string().trim().max(500).optional(),
});

export const jobIdParamSchema = z.object({
  id: z.string().uuid('Invalid job ID format'),
});

export const bookmarkJobIdParamSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export const recruiterJobsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  workMode: z.nativeEnum(WorkMode).optional(),
  location: z.string().trim().max(150).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const candidateJobSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  workMode: z.string().trim().optional(),
  employmentType: z.string().trim().optional(),
  experienceLevel: z.string().trim().optional(),
  department: z.string().trim().max(120).optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
  skills: z.string().trim().optional(),
  skillsMatch: z.enum(['ANY', 'ALL']).default('ANY'),
  sort: z
    .enum(['relevant', 'newest', 'oldest', 'salary_asc', 'salary_desc'])
    .default('relevant'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type JobPayloadInput = z.infer<typeof jobPayloadSchema>;
export type RecruiterJobsQuery = z.infer<typeof recruiterJobsQuerySchema>;
export type CandidateJobSearchQuery = z.infer<typeof candidateJobSearchQuerySchema>;

