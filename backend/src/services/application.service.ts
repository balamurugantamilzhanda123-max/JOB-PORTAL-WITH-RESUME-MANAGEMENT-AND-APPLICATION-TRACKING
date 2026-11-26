import {
  ApplicationStage,
  JobStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  computeExplainableMatchScore,
  ParsedResumeData,
} from './parser.service';
import {
  recordOutboxEvent,
  userRealtimeBus,
  writeAuditLog,
} from './realtime.service';

const ALLOWED_STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: [
    ApplicationStage.SCREENING,
    ApplicationStage.SHORTLISTED,
    ApplicationStage.INTERVIEW,
    ApplicationStage.REJECTED,
  ],
  SCREENING: [
    ApplicationStage.SHORTLISTED,
    ApplicationStage.INTERVIEW,
    ApplicationStage.OFFER,
    ApplicationStage.REJECTED,
  ],
  SHORTLISTED: [
    ApplicationStage.INTERVIEW,
    ApplicationStage.OFFER,
    ApplicationStage.REJECTED,
  ],
  INTERVIEW: [
    ApplicationStage.OFFER,
    ApplicationStage.HIRED,
    ApplicationStage.REJECTED,
  ],
  OFFER: [ApplicationStage.HIRED, ApplicationStage.REJECTED],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export async function submitApplication(params: {
  candidateId: string;
  jobId: string;
  resumeId: string;
  coverNote?: string;
  idempotencyKey?: string;
  screeningAnswers: Array<{ questionId: string; answer: string | boolean | string[] }>;
  ipAddress?: string;
}) {
  if (params.idempotencyKey) {
    const existingByKey = await prisma.application.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: {
        job: { select: { id: true, title: true, company: true } },
      },
    });
    if (existingByKey) {
      if (existingByKey.candidateId !== params.candidateId) {
        throw new ForbiddenError('Idempotency key belongs to another account');
      }
      return existingByKey;
    }
  }

  const [job, resume, existingDup] = await Promise.all([
    prisma.job.findUnique({
      where: { id: params.jobId },
      include: { screeningQuestions: { orderBy: { orderIndex: 'asc' } } },
    }),
    prisma.resume.findUnique({ where: { id: params.resumeId } }),
    prisma.application.findUnique({
      where: {
        jobId_candidateId: {
          jobId: params.jobId,
          candidateId: params.candidateId,
        },
      },
    }),
  ]);

  if (!job || job.status !== JobStatus.PUBLISHED) {
    throw new NotFoundError('This job opening is not published or no longer accepts applications.');
  }

  if (existingDup) {
    throw new ConflictError(
      'You have already submitted an application for this position.',
      'DUPLICATE_APPLICATION',
    );
  }

  if (!resume) {
    throw new NotFoundError('Selected resume was not found in your vault.');
  }
  if (resume.userId !== params.candidateId) {
    throw new ForbiddenError('You can only apply using your own uploaded resumes.');
  }

  // Validate required screening questions
  const answersMap = new Map(params.screeningAnswers.map((a) => [a.questionId, a.answer]));
  const normalizedAnswers: Array<{
    questionId: string;
    questionTitle: string;
    answer: string | boolean | string[];
  }> = [];

  for (const q of job.screeningQuestions) {
    const ans = answersMap.get(q.id);
    const isEmpty =
      ans === undefined ||
      ans === null ||
      (typeof ans === 'string' && ans.trim().length === 0) ||
      (Array.isArray(ans) && ans.length === 0);

    if (q.isRequired && isEmpty) {
      throw new BadRequestError(`Please answer required screening question: "${q.title}"`);
    }
    if (!isEmpty) {
      normalizedAnswers.push({
        questionId: q.id,
        questionTitle: q.title,
        answer: ans!,
      });
    }
  }

  const parsedJson = (resume.parsedJson as unknown as ParsedResumeData | null) ?? null;
  const breakdown = computeExplainableMatchScore({
    resumeSkills: resume.skills,
    parsedJson,
    jobRequiredSkills: job.requiredSkills,
    jobExperienceLevel: job.experienceLevel,
  });

  const resumeSnapshot = {
    resumeId: resume.id,
    title: resume.title,
    version: resume.version,
    fileName: resume.fileName,
    skills: resume.skills,
    parsedJson: resume.parsedJson,
    capturedAt: new Date().toISOString(),
  };

  const result = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        jobId: job.id,
        candidateId: params.candidateId,
        resumeId: resume.id,
        resumeSnapshot: resumeSnapshot as Prisma.InputJsonValue,
        matchScore: breakdown.totalScore,
        scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        screeningAnswers: normalizedAnswers as Prisma.InputJsonValue,
        coverNote: params.coverNote || null,
        idempotencyKey: params.idempotencyKey || null,
        stage: ApplicationStage.APPLIED,
      },
      include: {
        job: { select: { id: true, title: true, company: true, recruiterId: true } },
        candidate: { select: { id: true, fullName: true, email: true } },
      },
    });

    await tx.applicationEvent.create({
      data: {
        applicationId: app.id,
        actorId: params.candidateId,
        fromStage: null,
        toStage: ApplicationStage.APPLIED,
        eventType: 'APPLICATION_SUBMITTED',
        publicNote: `Application submitted with ${resume.title} (v${resume.version}).`,
      },
    });

    const recruiterNotification = await tx.notification.create({
      data: {
        userId: job.recruiterId,
        type: NotificationType.APPLICATION_SUBMITTED,
        title: `New application for ${job.title}`,
        body: `${app.candidate.fullName} applied with an advisory match score of ${breakdown.totalScore}%.`,
        payload: {
          applicationId: app.id,
          jobId: job.id,
          matchScore: breakdown.totalScore,
        },
      },
    });

    await recordOutboxEvent(tx, {
      eventType: 'application.submitted',
      aggregateType: 'Application',
      aggregateId: app.id,
      payload: {
        applicationId: app.id,
        jobId: job.id,
        matchScore: breakdown.totalScore,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.candidateId,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: app.id,
      metadata: { jobId: job.id, resumeId: resume.id, matchScore: breakdown.totalScore },
      ipAddress: params.ipAddress,
    });

    return { app, recruiterNotification };
  });

  userRealtimeBus.emitToUser({
    eventId: result.recruiterNotification.id,
    userId: job.recruiterId,
    eventType: 'application.submitted',
    aggregateType: 'Application',
    aggregateId: result.app.id,
    occurredAt: new Date().toISOString(),
    payload: {
      applicationId: result.app.id,
      jobId: job.id,
      jobTitle: job.title,
      candidateName: result.app.candidate.fullName,
      matchScore: breakdown.totalScore,
    },
  });

  return result.app;
}

export async function listCandidateApplications(candidateId: string) {
  const apps = await prisma.application.findMany({
    where: { candidateId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          workMode: true,
          employmentType: true,
          status: true,
        },
      },
      events: {
        orderBy: { occurredAt: 'asc' },
        select: {
          id: true,
          fromStage: true,
          toStage: true,
          eventType: true,
          publicNote: true,
          occurredAt: true,
        },
      },
      interviews: {
        orderBy: { startAt: 'asc' },
        select: {
          id: true,
          roundTitle: true,
          interviewType: true,
          startAt: true,
          endAt: true,
          timezone: true,
          meetingUrl: true,
          location: true,
          instructions: true,
          status: true,
          candidateResponse: true,
          respondedAt: true,
        },
      },
      evaluations: {
        where: { isCandidateVisible: true },
        select: {
          id: true,
          rating: true,
          notes: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });

  return apps.map((a) => ({
    ...a,
    matchScore: a.matchScore != null ? Number(a.matchScore) : null,
  }));
}

export async function getCandidateApplicationDetail(candidateId: string, applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          workMode: true,
          employmentType: true,
          status: true,
        },
      },
      events: {
        orderBy: { occurredAt: 'asc' },
        select: {
          id: true,
          fromStage: true,
          toStage: true,
          eventType: true,
          publicNote: true,
          occurredAt: true,
        },
      },
      interviews: {
        orderBy: { startAt: 'asc' },
      },
      evaluations: {
        where: { isCandidateVisible: true },
        select: {
          id: true,
          rating: true,
          notes: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!app) throw new NotFoundError('Application not found');
  if (app.candidateId !== candidateId) throw new ForbiddenError('Access denied');

  return {
    ...app,
    matchScore: app.matchScore != null ? Number(app.matchScore) : null,
  };
}

export async function listRecruiterApplicationsForJob(recruiterId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      recruiterId: true,
      title: true,
      company: true,
      location: true,
      workMode: true,
      status: true,
      requiredSkills: true,
    },
  });

  if (!job) throw new NotFoundError('Job not found');
  if (job.recruiterId !== recruiterId) {
    throw new ForbiddenError('You do not have permission to view applicants for this job.');
  }

  const applications = await prisma.application.findMany({
    where: { jobId },
    include: {
      candidate: {
        select: { id: true, fullName: true, email: true },
      },
      events: {
        orderBy: { occurredAt: 'desc' },
        take: 10,
      },
      interviews: {
        orderBy: { startAt: 'asc' },
      },
      evaluations: {
        orderBy: { submittedAt: 'desc' },
        include: {
          reviewer: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: [{ matchScore: 'desc' }, { appliedAt: 'asc' }],
  });

  return {
    job,
    applications: applications.map((a) => ({
      ...a,
      matchScore: a.matchScore != null ? Number(a.matchScore) : null,
      evaluations: a.evaluations.map((ev) => ({
        ...ev,
        rating: ev.rating != null ? Number(ev.rating) : null,
      })),
    })),
  };
}

export async function getRecruiterPipelineOverview(recruiterId: string) {
  const applications = await prisma.application.findMany({
    where: { job: { recruiterId } },
    include: {
      job: { select: { id: true, title: true, company: true } },
      candidate: { select: { id: true, fullName: true, email: true } },
      interviews: { orderBy: { startAt: 'asc' } },
      evaluations: {
        orderBy: { submittedAt: 'desc' },
        include: { reviewer: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: [{ matchScore: 'desc' }, { appliedAt: 'desc' }],
  });

  return applications.map((a) => ({
    ...a,
    matchScore: a.matchScore != null ? Number(a.matchScore) : null,
    evaluations: a.evaluations.map((ev) => ({
      ...ev,
      rating: ev.rating != null ? Number(ev.rating) : null,
    })),
  }));
}

export async function transitionApplicationStage(params: {
  recruiterId: string;
  applicationId: string;
  targetStage: ApplicationStage;
  publicNote?: string;
  internalNote?: string;
  ipAddress?: string;
}) {
  const existing = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      job: { select: { id: true, title: true, company: true, recruiterId: true } },
    },
  });

  if (!existing) throw new NotFoundError('Application not found');
  if (existing.job.recruiterId !== params.recruiterId) {
    throw new ForbiddenError('You do not own this job requisition.');
  }

  if (existing.stage === params.targetStage) {
    throw new BadRequestError(`Application is already in ${params.targetStage} stage.`);
  }

  const allowed = ALLOWED_STAGE_TRANSITIONS[existing.stage] || [];
  if (!allowed.includes(params.targetStage)) {
    throw new BadRequestError(
      `Invalid pipeline transition from ${existing.stage} to ${params.targetStage}.`,
      undefined,
      'INVALID_STAGE_TRANSITION',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.application.update({
      where: { id: existing.id },
      data: { stage: params.targetStage },
    });

    await tx.applicationEvent.create({
      data: {
        applicationId: existing.id,
        actorId: params.recruiterId,
        fromStage: existing.stage,
        toStage: params.targetStage,
        eventType: 'STAGE_CHANGED',
        publicNote:
          params.publicNote?.trim() ||
          `Application moved from ${existing.stage} to ${params.targetStage}.`,
        internalNote: params.internalNote?.trim() || null,
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: existing.candidateId,
        type: NotificationType.STAGE_CHANGED,
        title: `Application update: ${existing.job.title}`,
        body: `Your application at ${existing.job.company} moved to ${params.targetStage}.`,
        payload: {
          applicationId: existing.id,
          jobId: existing.job.id,
          stage: params.targetStage,
        },
      },
    });

    await recordOutboxEvent(tx, {
      eventType: 'application.stage_changed',
      aggregateType: 'Application',
      aggregateId: existing.id,
      payload: {
        applicationId: existing.id,
        fromStage: existing.stage,
        toStage: params.targetStage,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.recruiterId,
      action: 'APPLICATION_STAGE_CHANGED',
      entityType: 'Application',
      entityId: existing.id,
      metadata: { fromStage: existing.stage, toStage: params.targetStage },
      ipAddress: params.ipAddress,
    });

    return { app, notification };
  });

  userRealtimeBus.emitToUser({
    eventId: updated.notification.id,
    userId: existing.candidateId,
    eventType: 'application.stage_changed',
    aggregateType: 'Application',
    aggregateId: existing.id,
    occurredAt: new Date().toISOString(),
    payload: {
      applicationId: existing.id,
      stage: params.targetStage,
      jobTitle: existing.job.title,
    },
  });

  return {
    ...updated.app,
    matchScore: updated.app.matchScore != null ? Number(updated.app.matchScore) : null,
  };
}

