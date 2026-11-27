import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { checkDatabaseHealth, prisma, safeUserSelect } from '../prisma/client';
import { SafeUser } from '../types/api';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { writeAuditLog } from './realtime.service';

export interface UserRoleStats {
  totalUsers: number;
  candidateCount: number;
  recruiterCount: number;
  adminCount: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  activeSessionsCount: number;
}

export async function getAdminUserStats(): Promise<UserRoleStats> {
  const [
    totalUsers,
    candidateCount,
    recruiterCount,
    adminCount,
    activeUsersCount,
    activeSessionsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.CANDIDATE } }),
    prisma.user.count({ where: { role: UserRole.RECRUITER } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.authSession.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  return {
    totalUsers,
    candidateCount,
    recruiterCount,
    adminCount,
    activeUsersCount,
    inactiveUsersCount: totalUsers - activeUsersCount,
    activeSessionsCount,
  };
}

export async function getAdminDashboardData(adminUser: SafeUser) {
  const [stats, dbHealth] = await Promise.all([
    getAdminUserStats(),
    checkDatabaseHealth(),
  ]);

  return {
    user: adminUser,
    stats,
    system: {
      status: dbHealth.connected ? 'Operational' : 'Degraded',
      database: dbHealth.connected ? 'Connected' : 'Disconnected',
      databaseLatencyMs: dbHealth.latencyMs,
      environment: env.NODE_ENV,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    phaseRoadmap: {
      companyVerification: { available: true, targetPhase: 'Phase 6', label: 'Company Verification' },
      systemAnalytics: { available: true, targetPhase: 'Phase 6', label: 'System Analytics' },
      auditLogs: { available: true, targetPhase: 'Phase 6', label: 'Audit Logs' },
    },
    recentActivity: [],
  };
}

export async function listUsersForAdmin(filters?: {
  role?: UserRole;
  search?: string;
}) {
  const where: {
    role?: UserRole;
    OR?: Array<{ fullName?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>;
  } = {};

  if (filters?.role) {
    where.role = filters.role;
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const q = filters.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: safeUserSelect,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function updateUserRoleByAdmin(
  targetUserId: string,
  newRole: UserRole,
  actingAdminId: string,
): Promise<SafeUser> {
  if (targetUserId === actingAdminId) {
    throw new BadRequestError('Administrators cannot modify their own role.', 'SELF_ROLE_CHANGE_FORBIDDEN');
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('User not found');
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: safeUserSelect,
  });
}

export async function updateUserStatusByAdmin(
  targetUserId: string,
  isActive: boolean,
  actingAdminId: string,
): Promise<SafeUser> {
  if (targetUserId === actingAdminId && !isActive) {
    throw new BadRequestError('Administrators cannot deactivate their own account.', 'SELF_DEACTIVATE_FORBIDDEN');
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: safeUserSelect,
    });

    if (!isActive) {
      await tx.authSession.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return user;
  });

  return updated;
}

export async function revokeAllUserSessionsByAdmin(params: {
  targetUserId: string;
  actingAdminId: string;
  reason: string;
  ipAddress?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, email: true },
  });
  if (!existing) throw new NotFoundError('User not found');

  const count = await prisma.$transaction(async (tx) => {
    const res = await tx.authSession.updateMany({
      where: { userId: params.targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog(tx, {
      actorId: params.actingAdminId,
      action: 'ADMIN_USER_SESSIONS_REVOKED',
      entityType: 'User',
      entityId: params.targetUserId,
      metadata: { reason: params.reason, revokedCount: res.count },
      ipAddress: params.ipAddress,
    });

    return res.count;
  });

  return { revokedCount: count };
}

export async function listRetentionJobsForAdmin() {
  return prisma.retentionJob.findMany({
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
}

export async function createRetentionJobByAdmin(params: {
  adminId: string;
  subjectType: string;
  subjectId: string;
  policyKey: string;
  scheduledAt?: string;
  holdReason?: string;
  ipAddress?: string;
}) {
  const status = params.holdReason ? 'ON_HOLD' : 'SCHEDULED';
  const scheduledDate = params.scheduledAt
    ? new Date(params.scheduledAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const job = await tx.retentionJob.create({
      data: {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        policyKey: params.policyKey,
        status,
        scheduledAt: scheduledDate,
        holdReason: params.holdReason || null,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.adminId,
      action: 'RETENTION_JOB_CREATED',
      entityType: 'RetentionJob',
      entityId: job.id,
      metadata: {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        policyKey: params.policyKey,
        status,
      },
      ipAddress: params.ipAddress,
    });

    return job;
  });
}

export async function toggleRetentionHoldByAdmin(params: {
  adminId: string;
  retentionJobId: string;
  hold: boolean;
  holdReason?: string;
  ipAddress?: string;
}) {
  const existing = await prisma.retentionJob.findUnique({ where: { id: params.retentionJobId } });
  if (!existing) throw new NotFoundError('Retention job not found');
  if (existing.status === 'EXECUTED') {
    throw new BadRequestError('Executed retention jobs cannot be modified.');
  }
  if (params.hold && (!params.holdReason || params.holdReason.trim().length < 3)) {
    throw new BadRequestError('Hold reason (min 3 characters) is required when placing a legal hold.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.retentionJob.update({
      where: { id: params.retentionJobId },
      data: {
        status: params.hold ? 'ON_HOLD' : 'SCHEDULED',
        holdReason: params.hold ? params.holdReason!.trim() : null,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.adminId,
      action: params.hold ? 'RETENTION_HOLD_PLACED' : 'RETENTION_HOLD_RELEASED',
      entityType: 'RetentionJob',
      entityId: existing.id,
      metadata: { holdReason: updated.holdReason },
      ipAddress: params.ipAddress,
    });

    return updated;
  });
}

export async function executeRetentionJobByAdmin(params: {
  adminId: string;
  retentionJobId: string;
  ipAddress?: string;
}) {
  const existing = await prisma.retentionJob.findUnique({ where: { id: params.retentionJobId } });
  if (!existing) throw new NotFoundError('Retention job not found');
  if (existing.status === 'ON_HOLD') {
    throw new BadRequestError('Cannot execute retention job while a legal/operational hold is active.');
  }
  if (existing.status === 'EXECUTED') {
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    let resultMessage = `Evaluated policy ${existing.policyKey} for ${existing.subjectType}`;
    if (existing.subjectType === 'AuthSession') {
      const purged = await tx.authSession.deleteMany({
        where: { revokedAt: { not: null }, expiresAt: { lt: new Date() } },
      });
      resultMessage = `Purged ${purged.count} expired revoked auth sessions`;
    }

    const updated = await tx.retentionJob.update({
      where: { id: params.retentionJobId },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        result: resultMessage,
      },
    });

    await writeAuditLog(tx, {
      actorId: params.adminId,
      action: 'RETENTION_JOB_EXECUTED',
      entityType: 'RetentionJob',
      entityId: existing.id,
      metadata: { result: resultMessage },
      ipAddress: params.ipAddress,
    });

    return updated;
  });
}

export async function getSystemDiagnosticsForAdmin() {
  const [dbHealth, activeSessionsCount, outboxPendingCount, outboxTotalCount, parseFailuresCount] =
    await Promise.all([
      checkDatabaseHealth(),
      prisma.authSession.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.outboxEvent.count({ where: { publishedAt: null } }),
      prisma.outboxEvent.count(),
      prisma.resumeParseJob.count({ where: { status: 'FAILED' } }),
    ]);

  const blobConfigured = Boolean(
    env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );

  return {
    checkedAt: new Date().toISOString(),
    environment: env.NODE_ENV,
    deploymentPlatform: env.IS_VERCEL ? 'Vercel Serverless (Services)' : 'Node.js Runtime',
    api: {
      status: 'operational',
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    database: {
      status: dbHealth.connected ? 'connected' : 'disconnected',
      latencyMs: dbHealth.latencyMs,
      pooledRuntimeEnabled: Boolean(process.env.DATABASE_URL_POOLED || process.env.POSTGRES_PRISMA_URL),
    },
    storage: {
      provider: blobConfigured ? 'Vercel Blob (Persistent Cloud)' : 'Local Development Disk',
      accessMode: env.BLOB_ACCESS || 'private',
      configured: blobConfigured || !env.IS_VERCEL,
    },
    eventsAndQueues: {
      transport: env.IS_VERCEL
        ? 'Authenticated SSE + 15s Serverless Query Sync Fallback'
        : 'Authenticated SSE + In-Process EventBus + Outbox',
      outboxTotalCount,
      outboxPendingCount,
      resumeParseFailuresCount: parseFailuresCount,
    },
    security: {
      activeSessionsCount,
      cookieSecureFlag: env.NODE_ENV === 'production' || env.IS_VERCEL,
      emailProviderMode: 'sandbox (in-app notifications active)',
    },
  };
}

