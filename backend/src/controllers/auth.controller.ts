import { NextFunction, Request, Response } from 'express';
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from '../services/auth.service';
import { clearAuthCookies, COOKIE_NAMES, setAuthCookies } from '../utils/cookies';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { loginSchema, registerSchema } from '../validators/auth.validator';

function extractMetadata(req: Request) {
  return {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip || req.socket.remoteAddress,
  };
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await registerUser(validated, extractMetadata(req));

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });

    sendSuccess(
      res,
      { user: result.user },
      'Account registered successfully',
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await loginUser(validated, extractMetadata(req));

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });

    sendSuccess(res, { user: result.user }, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
}

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    const result = await refreshSession(rawRefreshToken, extractMetadata(req));

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });

    sendSuccess(res, { user: result.user }, 'Session refreshed successfully', 200);
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    await logoutSession({
      rawRefreshToken,
      sessionId: req.sessionId,
    });

    clearAuthCookies(res);
    sendSuccess(res, null, 'Logged out successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    sendSuccess(res, { user: req.user }, 'Authenticated user retrieved', 200);
  } catch (error) {
    next(error);
  }
}

