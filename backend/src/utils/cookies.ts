import { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { generateRandomToken, parseDurationToMs } from './crypto';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'ats_access_token',
  REFRESH_TOKEN: 'ats_refresh_token',
  CSRF_TOKEN: 'ats_csrf_token',
} as const;

const isProduction = env.NODE_ENV === 'production' || env.IS_VERCEL;

function baseHttpOnlyOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  };
}

export function setAuthCookies(
  res: Response,
  params: {
    accessToken: string;
    refreshToken: string;
    rememberMe: boolean;
  },
): string {
  const accessMaxAge = parseDurationToMs(env.ACCESS_TOKEN_EXPIRY);
  const refreshMaxAge = params.rememberMe
    ? parseDurationToMs(env.REFRESH_TOKEN_EXPIRY)
    : 24 * 60 * 60 * 1000;

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, params.accessToken, {
    ...baseHttpOnlyOptions(),
    path: '/',
    maxAge: accessMaxAge,
  });

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, params.refreshToken, {
    ...baseHttpOnlyOptions(),
    path: '/api/v1/auth',
    maxAge: refreshMaxAge,
  });

  const csrfToken = generateRandomToken(24);
  res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMaxAge,
  });

  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    ...baseHttpOnlyOptions(),
    path: '/',
  });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...baseHttpOnlyOptions(),
    path: '/api/v1/auth',
  });
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

