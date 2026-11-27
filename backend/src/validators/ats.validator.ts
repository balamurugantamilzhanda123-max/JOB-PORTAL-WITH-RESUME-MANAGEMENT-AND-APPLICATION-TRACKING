import {
  ApplicationStage,
  CandidateInterviewResponse,
  CompanyVerificationStatus,
  InterviewStatus,
} from '@prisma/client';
import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid identifier format'),
});

export const jobIdParamOnlySchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export const submitApplicationSchema = z.object({
  resumeId: z.string().uuid('Please select a valid resume from your vault'),
  coverNote: z.string().trim().max(3000).optional(),
  idempotencyKey: z.string().trim().max(128).optional(),
  screeningAnswers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: z.union([z.string(), z.boolean(), z.array(z.string())]),
      }),
    )
    .optional()
    .default([]),
});

export const applicationStageTransitionSchema = z.object({
  stage: z.nativeEnum(ApplicationStage),
  publicNote: z.string().trim().max(1000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

export const proposeInterviewSchema = z
  .object({
    roundTitle: z.string().trim().min(2).max(150),
    interviewType: z.string().trim().min(2).max(80).default('Technical'),
    startAt: z.string().datetime({ message: 'Valid ISO start time is required' }),
    endAt: z.string().datetime({ message: 'Valid ISO end time is required' }),
    timezone: z.string().trim().min(2).max(80).default('Asia/Kolkata'),
    meetingUrl: z.string().trim().url('Meeting URL must be valid').optional().or(z.literal('')),
    location: z.string().trim().max(250).optional(),
    instructions: z.string().trim().max(2000).optional(),
  })
  .refine((d) => new Date(d.endAt).getTime() > new Date(d.startAt).getTime(), {
    message: 'Interview end time must be after start time',
    path: ['endAt'],
  });

export const respondInterviewSchema = z.object({
  response: z.enum([
    CandidateInterviewResponse.ACCEPTED,
    CandidateInterviewResponse.DECLINED,
    CandidateInterviewResponse.RESCHEDULE_REQUESTED,
  ]),
  note: z.string().trim().max(1000).optional(),
});

export const updateInterviewStatusSchema = z.object({
  status: z.nativeEnum(InterviewStatus),
});

export const submitEvaluationSchema = z.object({
  interviewId: z.string().uuid().optional().nullable(),
  rating: z.number().min(1).max(5),
  recommendation: z.enum(['STRONG_NO', 'NO', 'MIXED', 'YES', 'STRONG_YES']),
  notes: z.string().trim().min(5, 'Evaluation notes are required').max(4000),
  isCandidateVisible: z.boolean().default(false),
  criteria: z
    .object({
      technicalSkills: z.number().min(1).max(5),
      problemSolving: z.number().min(1).max(5),
      communication: z.number().min(1).max(5),
      roleFit: z.number().min(1).max(5),
    })
    .optional(),
});

export const companyUpsertSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  displayName: z.string().trim().min(2).max(200),
  website: z.string().trim().url('Website must be a valid URL').optional().or(z.literal('')),
  industry: z.string().trim().max(150).optional(),
  sizeBand: z.string().trim().max(80).optional(),
  headquarters: z.string().trim().max(200).optional(),
  description: z.string().trim().max(3000).optional(),
});

export const companyVerifySchema = z.object({
  status: z.enum([
    CompanyVerificationStatus.VERIFIED,
    CompanyVerificationStatus.REJECTED,
    CompanyVerificationStatus.SUSPENDED,
    CompanyVerificationStatus.PENDING,
  ]),
  reason: z.string().trim().min(3, 'Verification decision reason is required').max(500),
});

export const resumeCorrectionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(60).optional(),
  summary: z.string().trim().max(2000).optional(),
  email: z.string().trim().email('Invalid contact email').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
});

export const retentionCreateSchema = z.object({
  subjectType: z.enum(['CandidateProfile', 'Resume', 'Application', 'AuthSession']),
  subjectId: z.string().trim().min(2).max(128),
  policyKey: z.string().trim().min(3).max(100),
  scheduledAt: z.string().datetime().optional(),
  holdReason: z.string().trim().max(500).optional(),
});

export const retentionHoldSchema = z.object({
  hold: z.boolean(),
  holdReason: z.string().trim().max(500).optional(),
});

export const adminActionReasonSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional().default('Administrative security action'),
});

