import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load backend/.env first, falling back to root .env (skipped cleanly on Vercel)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// Support Vercel Marketplace Postgres integrations (Neon, Prisma Postgres, Supabase)
const resolvedDirectDatabaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_POOLED ||
  process.env.POSTGRES_URL;

if (resolvedDirectDatabaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDirectDatabaseUrl;
}

const resolvedRuntimeDatabaseUrl =
  process.env.DATABASE_URL_POOLED ||
  process.env.POSTGRES_PRISMA_URL ||
  resolvedDirectDatabaseUrl;

const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_BRANCH_URL ||
  process.env.VERCEL_URL;

const defaultAppOrigin = vercelHost
  ? `https://${vercelHost}`
  : 'http://localhost:3000';

const defaultBackendOrigin = vercelHost
  ? `https://${vercelHost}`
  : 'http://localhost:4000';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default(defaultAppOrigin),
  BACKEND_URL: z.string().url().default(defaultBackendOrigin),
  ALLOWED_ORIGINS: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_ACCESS: z.enum(['private', 'public']).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_FULL_NAME: z.string().min(2).default('Platform Administrator'),
});

const parsed = envSchema.safeParse({
  ...process.env,
  FRONTEND_URL: process.env.FRONTEND_URL || defaultAppOrigin,
  BACKEND_URL: process.env.BACKEND_URL || defaultBackendOrigin,
});

const isVercelOrCiBuild = Boolean(process.env.VERCEL || process.env.CI);

if (!parsed.success && !isVercelOrCiBuild) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Check your .env or Vercel environment variables.');
}

const configErrors = parsed.success ? null : parsed.error.flatten().fieldErrors;
if (configErrors) {
  console.warn(
    '⚠️ Incomplete environment variables detected during Vercel/CI initialization:',
    configErrors,
  );
}

export const env = {
  NODE_ENV: (parsed.success
    ? parsed.data.NODE_ENV
    : process.env.NODE_ENV === 'production'
      ? 'production'
      : 'development') as 'development' | 'test' | 'production',
  PORT: parsed.success ? parsed.data.PORT : Number(process.env.PORT || 4000),
  DATABASE_URL: parsed.success ? parsed.data.DATABASE_URL : process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: parsed.success
    ? parsed.data.JWT_ACCESS_SECRET
    : process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: parsed.success
    ? parsed.data.JWT_REFRESH_SECRET
    : process.env.JWT_REFRESH_SECRET || '',
  ACCESS_TOKEN_EXPIRY: parsed.success
    ? parsed.data.ACCESS_TOKEN_EXPIRY
    : process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: parsed.success
    ? parsed.data.REFRESH_TOKEN_EXPIRY
    : process.env.REFRESH_TOKEN_EXPIRY || '7d',
  FRONTEND_URL: parsed.success ? parsed.data.FRONTEND_URL : defaultAppOrigin,
  BACKEND_URL: parsed.success ? parsed.data.BACKEND_URL : defaultBackendOrigin,
  ALLOWED_ORIGINS: parsed.success ? parsed.data.ALLOWED_ORIGINS : process.env.ALLOWED_ORIGINS,
  BLOB_READ_WRITE_TOKEN: parsed.success
    ? parsed.data.BLOB_READ_WRITE_TOKEN
    : process.env.BLOB_READ_WRITE_TOKEN,
  BLOB_ACCESS: parsed.success ? parsed.data.BLOB_ACCESS : undefined,
  ADMIN_EMAIL: parsed.success ? parsed.data.ADMIN_EMAIL : process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: parsed.success ? parsed.data.ADMIN_PASSWORD : process.env.ADMIN_PASSWORD,
  ADMIN_FULL_NAME: parsed.success
    ? parsed.data.ADMIN_FULL_NAME
    : process.env.ADMIN_FULL_NAME || 'Platform Administrator',
  RUNTIME_DATABASE_URL:
    resolvedRuntimeDatabaseUrl || (parsed.success ? parsed.data.DATABASE_URL : ''),
  IS_VERCEL: Boolean(process.env.VERCEL),
  CONFIG_ERRORS: configErrors,
};
export type Env = typeof env;

/**
 * Computes explicitly trusted origins for CORS & CSRF checks across
 * local dev, Vercel Production, Vercel Preview deployments, and custom domains.
 */
export function getConfiguredOrigins(): Set<string> {
  const origins = new Set<string>([env.FRONTEND_URL, env.BACKEND_URL]);

  if (env.ALLOWED_ORIGINS) {
    for (const raw of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = raw.trim().replace(/\/+$/, '');
      if (trimmed) origins.add(trimmed);
    }
  }

  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (host) {
      origins.add(`https://${host}`);
    }
  }

  return origins;
}

export function isOriginAllowed(origin: string, requestHost?: string): boolean {
  const normalized = origin.replace(/\/+$/, '');
  if (getConfiguredOrigins().has(normalized)) {
    return true;
  }

  // On same-origin deployments (e.g. Vercel preview URLs or custom domains),
  // accept when Origin host strictly equals the forwarded/request Host header.
  if (requestHost) {
    try {
      const originHost = new URL(normalized).host.toLowerCase();
      if (originHost === requestHost.toLowerCase()) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

