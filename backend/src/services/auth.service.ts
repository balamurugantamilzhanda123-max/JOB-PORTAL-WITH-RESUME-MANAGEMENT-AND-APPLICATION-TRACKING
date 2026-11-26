import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma, safeUserSelect } from '../prisma/client';
import { SafeUser } from '../types/api';
import {
  parseDurationToMs,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
  hashPassword,
} from '../utils/crypto';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthSessionResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

function calculateRefreshExpiry(rememberMe: boolean): { expiresIn: string; expiresAt: Date } {
  const expiresIn = rememberMe ? env.REFRESH_TOKEN_EXPIRY : '24h';
  const expiresAt = new Date(Date.now() + parseDurationToMs(expiresIn));
  return { expiresIn, expiresAt };
}

export async function registerUser(
  input: RegisterInput,
  metadata: RequestMetadata,
): Promise<AuthSessionResult> {
  if (input.role === 'ADMIN') {
    throw new ForbiddenError(
      'Public registration with the ADMIN role is strictly prohibited.',
      'ADMIN_REGISTRATION_FORBIDDEN',
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError('An account with this email address already exists.', 'EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);
  const role: UserRole = input.role === 'RECRUITER' ? UserRole.RECRUITER : UserRole.CANDIDATE;

  const sessionId = crypto.randomUUID();
  const familyId = crypto.randomUUID();
  const { expiresIn, expiresAt } = calculateRefreshExpiry(false);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        role,
        isActive: true,
      },
      select: safeUserSelect,
    });

    const refreshToken = signRefreshToken(
      { sub: createdUser.id, sid: sessionId, familyId },
      expiresIn,
    );

    await tx.authSession.create({
      data: {
        id: sessionId,
        userId: createdUser.id,
        tokenHash: sha256(refreshToken),
        familyId,
        rememberMe: false,
        userAgent: metadata.userAgent?.slice(0, 512),
        ipAddress: metadata.ipAddress?.slice(0, 64),
        expiresAt,
      },
    });

    return { createdUser, refreshToken };
  });

  const accessToken = signAccessToken({ sub: user.createdUser.id, sid: sessionId });

  return {
    user: user.createdUser,
    accessToken,
    refreshToken: user.refreshToken,
    rememberMe: false,
  };
}

export async function loginUser(
  input: LoginInput,
  metadata: RequestMetadata,
): Promise<AuthSessionResult> {
  const userRecord = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      ...safeUserSelect,
      passwordHash: true,
    },
  });

  if (!userRecord) {
    throw new UnauthorizedError('Invalid email address or password.', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await verifyPassword(userRecord.passwordHash, input.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email address or password.', 'INVALID_CREDENTIALS');
  }

  if (!userRecord.isActive) {
    throw new ForbiddenError(
      'Your account has been deactivated. Please contact an administrator.',
      'ACCOUNT_INACTIVE',
    );
  }

  const sessionId = crypto.randomUUID();
  const familyId = crypto.randomUUID();
  const rememberMe = Boolean(input.rememberMe);
  const { expiresIn, expiresAt } = calculateRefreshExpiry(rememberMe);

  const refreshToken = signRefreshToken(
    { sub: userRecord.id, sid: sessionId, familyId },
    expiresIn,
  );

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: userRecord.id,
      tokenHash: sha256(refreshToken),
      familyId,
      rememberMe,
      userAgent: metadata.userAgent?.slice(0, 512),
      ipAddress: metadata.ipAddress?.slice(0, 64),
      expiresAt,
    },
  });

  const accessToken = signAccessToken({ sub: userRecord.id, sid: sessionId });

  // Strip passwordHash before returning
  const { passwordHash: _removed, ...safeUser } = userRecord;

  return {
    user: safeUser,
    accessToken,
    refreshToken,
    rememberMe,
  };
}

export async function refreshSession(
  rawRefreshToken: string | undefined,
  metadata: RequestMetadata,
): Promise<AuthSessionResult> {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token is missing.', 'REFRESH_TOKEN_MISSING');
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.', 'REFRESH_TOKEN_INVALID');
  }

  const existingSession = await prisma.authSession.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        select: safeUserSelect,
      },
    },
  });

  if (!existingSession || existingSession.userId !== payload.sub) {
    throw new UnauthorizedError('Refresh session not found.', 'SESSION_NOT_FOUND');
  }

  const incomingHash = sha256(rawRefreshToken);
  if (existingSession.revokedAt !== null || existingSession.tokenHash !== incomingHash) {
    // Token reuse / rotation replay detected: revoke the entire session family
    await prisma.authSession.updateMany({
      where: { familyId: existingSession.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError(
      'Session token reuse detected. Please log in again.',
      'TOKEN_REUSE_DETECTED',
    );
  }

  if (existingSession.expiresAt.getTime() <= Date.now()) {
    await prisma.authSession.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh session has expired. Please log in again.');
  }

  if (!existingSession.user.isActive) {
    await prisma.authSession.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });
    throw new ForbiddenError('Account has been deactivated.');
  }

  const newSessionId = crypto.randomUUID();
  const { expiresIn, expiresAt } = calculateRefreshExpiry(existingSession.rememberMe);
  const newRefreshToken = signRefreshToken(
    {
      sub: existingSession.userId,
      sid: newSessionId,
      familyId: existingSession.familyId,
    },
    expiresIn,
  );

  await prisma.$transaction(async (tx) => {
    await tx.authSession.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    await tx.authSession.create({
      data: {
        id: newSessionId,
        userId: existingSession.userId,
        tokenHash: sha256(newRefreshToken),
        familyId: existingSession.familyId,
        rememberMe: existingSession.rememberMe,
        userAgent: metadata.userAgent?.slice(0, 512),
        ipAddress: metadata.ipAddress?.slice(0, 64),
        expiresAt,
      },
    });
  });

  const accessToken = signAccessToken({ sub: existingSession.userId, sid: newSessionId });

  return {
    user: existingSession.user,
    accessToken,
    refreshToken: newRefreshToken,
    rememberMe: existingSession.rememberMe,
  };
}

export async function logoutSession(params: {
  rawRefreshToken?: string;
  sessionId?: string;
}): Promise<void> {
  const conditions: Array<{ id?: string; tokenHash?: string }> = [];

  if (params.sessionId) {
    conditions.push({ id: params.sessionId });
  }
  if (params.rawRefreshToken) {
    conditions.push({ tokenHash: sha256(params.rawRefreshToken) });
  }

  if (conditions.length === 0) {
    return;
  }

  await prisma.authSession.updateMany({
    where: {
      OR: conditions,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

