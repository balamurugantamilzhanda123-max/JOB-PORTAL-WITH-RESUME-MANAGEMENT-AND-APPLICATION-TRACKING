import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { checkDatabaseHealth, prisma, safeUserSelect } from '../prisma/client';
import { SafeUser } from '../types/api';
import { BadRequestError, NotFoundError } from '../utils/errors';

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
      companyVerification: { available: false, targetPhase: 'Phase 6', label: 'Company Verification' },
      systemAnalytics: { available: false, targetPhase: 'Phase 6', label: 'System Analytics' },
      auditLogs: { available: false, targetPhase: 'Phase 6', label: 'Audit Logs' },
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

