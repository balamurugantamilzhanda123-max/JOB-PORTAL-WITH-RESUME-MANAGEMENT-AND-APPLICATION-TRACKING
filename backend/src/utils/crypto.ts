import crypto from 'crypto';
import argon2 from 'argon2';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: 'access';
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  familyId: string;
  type: 'refresh';
  jti: string;
}

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected e.g. 15m, 1h, 7d.`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export function signAccessToken(payload: { sub: string; sid: string }): string {
  const tokenPayload: AccessTokenPayload = {
    sub: payload.sub,
    sid: payload.sid,
    type: 'access',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'],
    issuer: 'talentforge-ats',
    audience: 'talentforge-ats-client',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'talentforge-ats',
    audience: 'talentforge-ats-client',
  }) as AccessTokenPayload;

  if (decoded.type !== 'access' || !decoded.sub || !decoded.sid) {
    throw new Error('Invalid access token payload');
  }
  return decoded;
}

export function signRefreshToken(
  payload: { sub: string; sid: string; familyId: string },
  expiresIn: string,
): string {
  const tokenPayload: RefreshTokenPayload = {
    sub: payload.sub,
    sid: payload.sid,
    familyId: payload.familyId,
    type: 'refresh',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer: 'talentforge-ats',
    audience: 'talentforge-ats-refresh',
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'talentforge-ats',
    audience: 'talentforge-ats-refresh',
  }) as RefreshTokenPayload;

  if (decoded.type !== 'refresh' || !decoded.sub || !decoded.sid || !decoded.familyId) {
    throw new Error('Invalid refresh token payload');
  }
  return decoded;
}

