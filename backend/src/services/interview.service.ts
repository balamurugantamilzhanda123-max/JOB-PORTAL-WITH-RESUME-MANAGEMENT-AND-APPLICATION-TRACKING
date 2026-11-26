import {
  ApplicationStage,
  CandidateInterviewResponse,
  InterviewStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { prisma } from '../prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import {
  recordOutboxEvent,
  userRealtimeBus,
  writeAuditLog,
} from './realtime.service';

export async function proposeInterview(params: {
  recruiterId: string;
  applicationId: string;
  roundTitle: string;
  interviewType: string;
  startAt: string;
  endAt: string;
  timezone: string;
  meetingUrl?: string;
  location?: string;
  instructions?: string;
  ipAddress?: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      job: { select: { id: true, title: true, company: true, recruiterId: true } },
    },
  });

  if (!application) throw new NotFoundError('Application not found');
  if (application.job.recruiterId !== params.recruiterId) {
    throw new ForbiddenError('You do not have permission to schedule interviews for this job.');
  }

  const startDate = new Date(params.startAt);
  const endDate = new Date(params.endAt);
  if (endDate.getTime() <= startDate.getTime()) {
    throw new BadRequestError('Interview end time must be after start time.');
  }

  const created = await prisma.$transaction(async (tx) => {
    const interview = await tx.interview.create({
      data: {
        applicationId: application.id,
        organizerId: params.recruiterId,
        roundTitle: params.roundTitle,
        interviewType: params.interviewType,
        startAt: startDate,
        endAt: endDate,
        timezone: params.timezone,
        meetingUrl: params.meetingUrl || null,
        location: params.location || null,
        instructions: params.instructions || null,
        status: InterviewStatus.PROPOSED,
        candidateResponse: CandidateInterviewResponse.PENDING,
      },
    });

    if (
      application.stage === ApplicationStage.APPLIED ||
      application.stage === ApplicationStage.SCREENING ||
      application.stage === ApplicationStage.SHORTLISTED
    ) {
      await tx.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.INTERVIEW },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: application.id,
          actorId: params.recruiterId,
          fromStage: application.stage,
          toStage: ApplicationStage.INTERVIEW,
          eventType: 'INTERVIEW_SCHEDULED',
          publicNote: `${params.roundTitle} proposed for ${startDate.toISOString()} (${params.timezone}).`,
        },
      });
    }

    const notification = await tx.notification.create({
      data: {
        userId: application.candidateId,
        type: NotificationType.INTERVIEW_PROPOSED,
        title: `Interview proposed: ${application.job.title}`,
        body: `${application.job.company} proposed "${params.roundTitle}" (${params.interviewType}). Please review and confirm.`,
        payload: {
          interviewId: interview.id,
          applicationId: application.id,
          startAt: startDate.toISOString(),
          timezone: params.timezone,
        },
      },
    });

    await recordOutboxEvent(tx, {
      eventType: 'interview.proposed',
      aggregateType: 'Interview',
      aggregateId: interview.id,
      payload: {
        interviewId: interview.id,
        applicationId: application.id,
        startAt: startDate.toISOString(),
      },
    });

    await writeAuditLog(tx, {
      actorId: params.recruiterId,
      action: 'INTERVIEW_PROPOSED',
      entityType: 'Interview',
      entityId: interview.id,
      metadata: { applicationId: application.id, roundTitle: params.roundTitle },
      ipAddress: params.ipAddress,
    });

    return { interview, notification };
  });

  userRealtimeBus.emitToUser({
    eventId: created.notification.id,
    userId: application.candidateId,
    eventType: 'interview.proposed',
    aggregateType: 'Interview',
    aggregateId: created.interview.id,
    occurredAt: new Date().toISOString(),
    payload: {
      interviewId: created.interview.id,
      applicationId: application.id,
      roundTitle: params.roundTitle,
    },
  });

  return created.interview;
}

export async function listCandidateInterviews(candidateId: string) {
  return prisma.interview.findMany({
    where: { application: { candidateId } },
    include: {
      application: {
        select: {
          id: true,
          stage: true,
          job: {
            select: { id: true, title: true, company: true, location: true, workMode: true },
          },
        },
      },
    },
    orderBy: { startAt: 'asc' },
  });
}

export async function respondToInterview(params: {
  candidateId: string;
  interviewId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'RESCHEDULE_REQUESTED';
  note?: string;
}) {
  const interview = await prisma.interview.findUnique({
    where: { id: params.interviewId },
    include: {
      application: {
        include: {
          job: { select: { id: true, title: true, recruiterId: true } },
          candidate: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!interview) throw new NotFoundError('Interview not found');
  if (interview.application.candidateId !== params.candidateId) {
    throw new ForbiddenError('You can only respond to your own interview invitations.');
  }

  let nextStatus = interview.status;
  if (params.response === CandidateInterviewResponse.ACCEPTED) {
    nextStatus = InterviewStatus.CONFIRMED;
  } else if (params.response === CandidateInterviewResponse.DECLINED) {
    nextStatus = InterviewStatus.CANCELLED;
  } else if (params.response === CandidateInterviewResponse.RESCHEDULE_REQUESTED) {
    nextStatus = InterviewStatus.RESCHEDULE_REQUESTED;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.interview.update({
      where: { id: interview.id },
      data: {
        candidateResponse: params.response,
        candidateNote: params.note || null,
        respondedAt: new Date(),
        status: nextStatus,
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: interview.application.job.recruiterId,
        type: NotificationType.INTERVIEW_RESPONDED,
        title: `Interview ${params.response.toLowerCase()}: ${interview.application.job.title}`,
        body: `${interview.application.candidate.fullName} responded ${params.response} to "${interview.roundTitle}".`,
        payload: {
          interviewId: interview.id,
          applicationId: interview.applicationId,
          response: params.response,
        },
      },
    });

    await recordOutboxEvent(tx, {
      eventType: 'interview.responded',
      aggregateType: 'Interview',
      aggregateId: interview.id,
      payload: {
        interviewId: interview.id,
        response: params.response,
        status: nextStatus,
      },
    });

    return { updated, notification };
  });

  userRealtimeBus.emitToUser({
    eventId: result.notification.id,
    userId: interview.application.job.recruiterId,
    eventType: 'interview.responded',
    aggregateType: 'Interview',
    aggregateId: interview.id,
    occurredAt: new Date().toISOString(),
    payload: {
      interviewId: interview.id,
      response: params.response,
      status: nextStatus,
    },
  });

  return result.updated;
}

export async function listRecruiterInterviews(recruiterId: string) {
  return prisma.interview.findMany({
    where: { application: { job: { recruiterId } } },
    include: {
      application: {
        select: {
          id: true,
          stage: true,
          matchScore: true,
          candidate: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true, company: true } },
        },
      },
      evaluations: {
        include: { reviewer: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: { startAt: 'asc' },
  });
}

export async function updateRecruiterInterviewStatus(params: {
  recruiterId: string;
  interviewId: string;
  status: InterviewStatus;
}) {
  const interview = await prisma.interview.findUnique({
    where: { id: params.interviewId },
    include: { application: { include: { job: true } } },
  });

  if (!interview) throw new NotFoundError('Interview not found');
  if (interview.application.job.recruiterId !== params.recruiterId) {
    throw new ForbiddenError('Access denied');
  }

  return prisma.interview.update({
    where: { id: interview.id },
    data: { status: params.status },
  });
}

export async function submitEvaluationScorecard(params: {
  reviewerId: string;
  applicationId: string;
  interviewId?: string | null;
  rating: number;
  recommendation: string;
  notes: string;
  isCandidateVisible: boolean;
  criteria?: Record<string, number>;
  ipAddress?: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      job: { select: { id: true, title: true, recruiterId: true } },
    },
  });

  if (!application) throw new NotFoundError('Application not found');
  if (application.job.recruiterId !== params.reviewerId) {
    throw new ForbiddenError('You can only evaluate applicants for your own jobs.');
  }

  if (params.rating < 1 || params.rating > 5) {
    throw new BadRequestError('Evaluation rating must be between 1 and 5.');
  }

  const evaluation = await prisma.$transaction(async (tx) => {
    const created = await tx.evaluation.create({
      data: {
        applicationId: application.id,
        reviewerId: params.reviewerId,
        interviewId: params.interviewId || null,
        rating: params.rating,
        recommendation: params.recommendation,
        notes: params.notes,
        isCandidateVisible: params.isCandidateVisible,
        criteria: (params.criteria ?? null) as Prisma.InputJsonValue,
        interviewDate: new Date(),
      },
      include: {
        reviewer: { select: { id: true, fullName: true } },
      },
    });

    if (params.interviewId) {
      await tx.interview.updateMany({
        where: { id: params.interviewId, applicationId: application.id },
        data: { status: InterviewStatus.COMPLETED },
      });
    }

    await writeAuditLog(tx, {
      actorId: params.reviewerId,
      action: 'EVALUATION_SUBMITTED',
      entityType: 'Evaluation',
      entityId: created.id,
      metadata: {
        applicationId: application.id,
        rating: params.rating,
        recommendation: params.recommendation,
      },
      ipAddress: params.ipAddress,
    });

    return created;
  });

  return {
    ...evaluation,
    rating: evaluation.rating != null ? Number(evaluation.rating) : null,
  };
}

export async function listEvaluationsForApplication(params: {
  requesterId: string;
  requesterRole: UserRole;
  applicationId: string;
}) {
  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: { job: { select: { recruiterId: true } } },
  });

  if (!application) throw new NotFoundError('Application not found');

  if (params.requesterRole === UserRole.CANDIDATE) {
    if (application.candidateId !== params.requesterId) {
      throw new ForbiddenError('Access denied');
    }
    const visible = await prisma.evaluation.findMany({
      where: { applicationId: application.id, isCandidateVisible: true },
      select: {
        id: true,
        rating: true,
        notes: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return visible.map((e) => ({
      ...e,
      rating: e.rating != null ? Number(e.rating) : null,
    }));
  }

  if (
    params.requesterRole === UserRole.RECRUITER &&
    application.job.recruiterId !== params.requesterId
  ) {
    throw new ForbiddenError('Access denied');
  }

  const all = await prisma.evaluation.findMany({
    where: { applicationId: application.id },
    include: { reviewer: { select: { id: true, fullName: true } } },
    orderBy: { submittedAt: 'desc' },
  });

  return all.map((e) => ({
    ...e,
    rating: e.rating != null ? Number(e.rating) : null,
  }));
}

