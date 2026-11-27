import { ApplicationStage, JobStatus, UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';

export async function getHiringFunnelAnalytics(params: {
  role: UserRole;
  userId: string;
}) {
  const jobWhere =
    params.role === UserRole.RECRUITER ? { recruiterId: params.userId } : undefined;
  const appWhere =
    params.role === UserRole.RECRUITER ? { job: { recruiterId: params.userId } } : undefined;

  const [
    totalJobs,
    publishedJobs,
    pausedJobs,
    closedJobs,
    applications,
    interviewsCount,
    jobsBreakdown,
  ] = await Promise.all([
    prisma.job.count({ where: jobWhere }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.PUBLISHED } }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.PAUSED } }),
    prisma.job.count({ where: { ...jobWhere, status: JobStatus.CLOSED } }),
    prisma.application.findMany({
      where: appWhere,
      select: {
        id: true,
        jobId: true,
        stage: true,
        matchScore: true,
        appliedAt: true,
        updatedAt: true,
      },
    }),
    prisma.interview.count({
      where:
        params.role === UserRole.RECRUITER
          ? { application: { job: { recruiterId: params.userId } } }
          : undefined,
    }),
    prisma.job.findMany({
      where: jobWhere,
      select: {
        id: true,
        title: true,
        company: true,
        status: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const totalApplications = applications.length;
  const stageBreakdown: Record<ApplicationStage, number> = {
    APPLIED: 0,
    SCREENING: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };

  let scoreSum = 0;
  let scoreCount = 0;
  let timeToHireDaysSum = 0;
  let timeToHireCount = 0;
  const filledJobIds = new Set<string>();

  for (const app of applications) {
    stageBreakdown[app.stage] = (stageBreakdown[app.stage] || 0) + 1;
    if (app.matchScore != null) {
      scoreSum += Number(app.matchScore);
      scoreCount += 1;
    }
    if (app.stage === ApplicationStage.HIRED || app.stage === ApplicationStage.OFFER) {
      filledJobIds.add(app.jobId);
      const days = Math.max(
        0,
        (app.updatedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      timeToHireDaysSum += days;
      timeToHireCount += 1;
    }
  }

  const averageMatchScore =
    scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;
  const timeToHireDaysAvg =
    timeToHireCount > 0 ? Math.round((timeToHireDaysSum / timeToHireCount) * 10) / 10 : null;
  const jobFillRatePct =
    totalJobs > 0 ? Math.round((filledJobIds.size / totalJobs) * 100) : 0;

  const progressedBeyondApplied =
    totalApplications - stageBreakdown.APPLIED - stageBreakdown.WITHDRAWN;
  const reachedInterviewOrLater =
    stageBreakdown.INTERVIEW + stageBreakdown.OFFER + stageBreakdown.HIRED;
  const offersOrHired = stageBreakdown.OFFER + stageBreakdown.HIRED;

  return {
    scope: params.role === UserRole.ADMIN ? 'PLATFORM' : 'RECRUITER',
    generatedAt: new Date().toISOString(),
    totals: {
      totalJobs,
      publishedJobs,
      pausedJobs,
      closedJobs,
      totalApplications,
      interviewsCount,
      averageMatchScore,
      timeToHireDaysAvg,
      jobFillRatePct,
    },
    stageBreakdown,
    conversions: {
      appliedToScreeningPct:
        totalApplications > 0 ? Math.round((progressedBeyondApplied / totalApplications) * 100) : 0,
      appliedToInterviewPct:
        totalApplications > 0 ? Math.round((reachedInterviewOrLater / totalApplications) * 100) : 0,
      appliedToOfferPct:
        totalApplications > 0 ? Math.round((offersOrHired / totalApplications) * 100) : 0,
      rejectionRatePct:
        totalApplications > 0 ? Math.round((stageBreakdown.REJECTED / totalApplications) * 100) : 0,
    },
    topJobs: jobsBreakdown.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      status: j.status,
      applicantsCount: j._count.applications,
    })),
  };
}

export async function listAuditLogsForAdmin(params?: {
  action?: string;
  entityType?: string;
  limit?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      ...(params?.action ? { action: { contains: params.action, mode: 'insensitive' } } : {}),
      ...(params?.entityType ? { entityType: params.entityType } : {}),
    },
    include: {
      actor: { select: { id: true, fullName: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: params?.limit ?? 100,
  });
}

