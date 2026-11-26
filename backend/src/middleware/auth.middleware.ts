import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma, safeUserSelect } from '../prisma/client';
import { COOKIE_NAMES } from '../utils/cookies';
import { verifyAccessToken } from '../utils/crypto';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Verifies the HttpOnly JWT access token, validates that the backing auth session
 * is active, and loads the latest user record from PostgreSQL so any role or
 * status changes take effect immediately.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const accessToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
    if (!accessToken || typeof accessToken !== 'string') {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(accessToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token.');
    }

    const session = await prisma.authSession.findUnique({
      where: { id: decoded.sid },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!session || session.userId !== decoded.sub || session.revokedAt !== null) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Session has expired. Please log in again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: safeUserSelect,
    });

    if (!user) {
      throw new UnauthorizedError('Authenticated account no longer exists.');
    }

    if (!user.isActive) {
      throw new ForbiddenError('This account has been deactivated. Contact an administrator.');
    }

    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforces role-based authorization using the verified database role on req.user.
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}.`,
        ),
      );
      return;
    }

    next();
  };
}

/**
 * Double-submit cookie + Origin verification for state-changing endpoints.
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (origin) {
    const allowedOrigins = new Set([env.FRONTEND_URL, env.BACKEND_URL]);
    if (!allowedOrigins.has(origin)) {
      next(new ForbiddenError('Invalid request origin', 'CSRF_ORIGIN_MISMATCH'));
      return;
    }
  }

  const csrfCookie = req.cookies?.[COOKIE_NAMES.CSRF_TOKEN];
  if (csrfCookie && typeof csrfCookie === 'string') {
    const csrfHeader = req.get('x-csrf-token');
    if (!csrfHeader || typeof csrfHeader !== 'string') {
      next(new ForbiddenError('Missing CSRF token header', 'CSRF_TOKEN_MISSING'));
      return;
    }

    const cookieBuf = Buffer.from(csrfCookie, 'utf8');
    const headerBuf = Buffer.from(csrfHeader, 'utf8');
    if (
      cookieBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      next(new ForbiddenError('Invalid CSRF token', 'CSRF_TOKEN_INVALID'));
      return;
    }
  }

  next();
}

