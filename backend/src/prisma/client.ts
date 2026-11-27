import { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(env.RUNTIME_DATABASE_URL
      ? {
          datasources: {
            db: {
              url: env.RUNTIME_DATABASE_URL,
            },
          },
        }
      : {}),
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Reuse single PrismaClient across warm serverless invocations & dev hot-reloads
globalForPrisma.prisma = prisma;

/**
 * Explicit safe projection for User records so passwordHash is never queried or leaked.
 */
export const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
}> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    };
  } catch {
    return {
      connected: false,
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    };
  }
}

