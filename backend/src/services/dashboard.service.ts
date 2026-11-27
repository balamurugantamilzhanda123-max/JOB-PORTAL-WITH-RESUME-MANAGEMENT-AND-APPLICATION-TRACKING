import { JobStatus } from '@prisma/client';
import { prisma, safeUserSelect } from '../prisma/client';
import { NotFoundError } from '../utils/errors';

export async function getCandidateDashboardData(userId: string) {
  const {
    user,
    resumeCount,
    applicationCount,
    bookmarkedJobsCount,
    publishedJobsCount,
    upcomingInterviewsCount,
    unreadNotificationsCount,
  } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
    const rCount = await tx.resume.count({ where: { userId } });
    const aCount = await tx.application.count({ where: { candidateId: userId } });
    const bCount = await tx.jobBookmark.count({ where: { candidateId: userId } });
    const pCount = await tx.job.count({ where: { status: JobStatus.PUBLISHED } });
    const iCount = await tx.interview.count({
      where: { application: { candidateId: userId }, startAt: { gte: new Date() } },
    });
    const nCount = await tx.notification.count({ where: { userId, readAt: null } });

    return {
      user: u,
      resumeCount: rCount,
      applicationCount: aCount,
      bookmarkedJobsCount: bCount,
      publishedJobsCount: pCount,
      upcomingInterviewsCount: iCount,
      unreadNotificationsCount: nCount,
    };
  });

  if (!user) {
    throw new NotFoundError('Candidate profile not found');
  }

  const completedChecks = [
    Boolean(user.fullName),
    Boolean(user.email),
    user.isActive,
    resumeCount > 0,
  ];
  const profileCompletionPercent = Math.round(
    (completedChecks.filter(Boolean).length / completedChecks.length) * 100,
  );

  return {
    user,
    summary: {
      profileCompletionPercent,
      resumeCount,
      applicationCount,
      bookmarkedJobsCount,
      publishedJobsCount,
      upcomingInterviewsCount,
      unreadNotificationsCount,
      accountStatus: user.isActive ? 'Active' : 'Inactive',
    },
    phaseRoadmap: {
      jobDiscovery: { available: true, targetPhase: 'Phase 2', label: 'Explore Jobs' },
      savedJobs: { available: true, targetPhase: 'Phase 2', label: 'Saved Jobs' },
      resumeVault: { available: true, targetPhase: 'Phase 3', label: 'Resume Vault & Parsing' },
      applications: { available: true, targetPhase: 'Phase 4', label: 'My Applications' },
    },
    recentActivity: [],
  };
}

export async function getRecruiterDashboardData(userId: string) {
  const {
    user,
    publishedJobsCount,
    totalJobsCount,
    applicantsCount,
    scheduledInterviewsCount,
    unreadNotificationsCount,
  } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
    const pubCount = await tx.job.count({
      where: { recruiterId: userId, status: JobStatus.PUBLISHED },
    });
    const totCount = await tx.job.count({ where: { recruiterId: userId } });
    const appCount = await tx.application.count({
      where: { job: { recruiterId: userId } },
    });
    const intCount = await tx.interview.count({
      where: { application: { job: { recruiterId: userId } } },
    });
    const notifCount = await tx.notification.count({
      where: { userId, readAt: null },
    });

    return {
      user: u,
      publishedJobsCount: pubCount,
      totalJobsCount: totCount,
      applicantsCount: appCount,
      scheduledInterviewsCount: intCount,
      unreadNotificationsCount: notifCount,
    };
  });

  if (!user) {
    throw new NotFoundError('Recruiter profile not found');
  }

  return {
    user,
    summary: {
      activeJobsCount: publishedJobsCount,
      totalJobsCount,
      totalApplicantsCount: applicantsCount,
      scheduledInterviewsCount,
      unreadNotificationsCount,
      accountStatus: user.isActive ? 'Active' : 'Inactive',
    },
    phaseRoadmap: {
      jobManagement: { available: true, targetPhase: 'Phase 2', label: 'Job Management' },
      candidatePipeline: { available: true, targetPhase: 'Phase 4', label: 'Candidate Pipeline' },
      interviews: { available: true, targetPhase: 'Phase 5', label: 'Interviews & Scorecards' },
      analytics: { available: true, targetPhase: 'Phase 6', label: 'Hiring Analytics' },
    },
    recentActivity: [],
  };
}
