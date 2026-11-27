import { prisma, safeUserSelect } from '../prisma/client';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { writeAuditLog } from './realtime.service';

export async function getUserProfile(userId: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);
  if (!user) throw new NotFoundError('User account not found');
  return { user, profile };
}

export async function updateUserProfile(
  userId: string,
  data: {
    fullName?: string;
    headline?: string | null;
    phone?: string | null;
    location?: string | null;
    bio?: string | null;
    experienceSummary?: string | null;
    education?: string | null;
    skills?: string[];
    portfolioUrl?: string | null;
    profileVisible?: boolean;
  },
  ipAddress?: string,
) {
  const { fullName, portfolioUrl, skills, ...profileFields } = data;
  const normalizedSkills = skills
    ? Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean)))
    : undefined;

  const result = await prisma.$transaction(async (tx) => {
    const user = fullName
      ? await tx.user.update({
          where: { id: userId },
          data: { fullName },
          select: safeUserSelect,
        })
      : await tx.user.findUniqueOrThrow({ where: { id: userId }, select: safeUserSelect });

    const profile = await tx.userProfile.upsert({
      where: { userId },
      update: {
        ...profileFields,
        ...(normalizedSkills !== undefined ? { skills: normalizedSkills } : {}),
        ...(portfolioUrl !== undefined ? { portfolioUrl: portfolioUrl || null } : {}),
      },
      create: {
        userId,
        ...profileFields,
        skills: normalizedSkills ?? [],
        portfolioUrl: portfolioUrl || null,
      },
    });

    await writeAuditLog(tx, {
      actorId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'UserProfile',
      entityId: profile.id,
      ipAddress,
    });

    return { user, profile };
  });

  return result;
}

export async function changeUserPassword(params: {
  userId: string;
  currentSessionId?: string;
  currentPassword: string;
  newPassword: string;
  ipAddress?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account is inactive or unavailable.');
  }

  const valid = await verifyPassword(user.passwordHash, params.currentPassword);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
  }

  const nextHash = await hashPassword(params.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: params.userId },
      data: { passwordHash: nextHash },
    });

    // Revoke other active sessions upon password change
    await tx.authSession.updateMany({
      where: {
        userId: params.userId,
        revokedAt: null,
        ...(params.currentSessionId ? { id: { not: params.currentSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog(tx, {
      actorId: params.userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: params.userId,
      ipAddress: params.ipAddress,
    });
  });
}

export async function listUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.authSession.findMany({
    where: { userId },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      rememberMe: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  return sessions.map((s) => ({
    ...s,
    isCurrent: s.id === currentSessionId,
    isActive: s.revokedAt === null && s.expiresAt.getTime() > Date.now(),
  }));
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  ipAddress?: string,
) {
  const existing = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!existing) throw new NotFoundError('Session not found');
  if (existing.userId !== userId) throw new ForbiddenError('Access denied');

  if (!existing.revokedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.authSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
      await writeAuditLog(tx, {
        actorId: userId,
        action: 'SESSION_REVOKED',
        entityType: 'AuthSession',
        entityId: sessionId,
        ipAddress,
      });
    });
  }
}

export async function getNotificationPreferences(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      emailNotifications: true,
      interviewReminders: true,
      marketingUpdates: true,
      profileVisible: true,
    },
  });

  return (
    profile ?? {
      emailNotifications: true,
      interviewReminders: true,
      marketingUpdates: false,
      profileVisible: true,
    }
  );
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: {
    emailNotifications?: boolean;
    interviewReminders?: boolean;
    marketingUpdates?: boolean;
    profileVisible?: boolean;
  },
) {
  const updated = await prisma.userProfile.upsert({
    where: { userId },
    update: prefs,
    create: {
      userId,
      emailNotifications: prefs.emailNotifications ?? true,
      interviewReminders: prefs.interviewReminders ?? true,
      marketingUpdates: prefs.marketingUpdates ?? false,
      profileVisible: prefs.profileVisible ?? true,
    },
    select: {
      emailNotifications: true,
      interviewReminders: true,
      marketingUpdates: true,
      profileVisible: true,
    },
  });

  return updated;
}
