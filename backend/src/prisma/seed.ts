import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { hashPassword } from '../utils/crypto';
import { prisma } from './client';

async function main(): Promise<void> {
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD;
  const adminFullName = env.ADMIN_FULL_NAME.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be configured in the environment before running the admin seed.',
    );
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  if (!passwordRegex.test(adminPassword)) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and special character.',
    );
  }

  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminFullName,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      fullName: adminFullName,
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.info('✅ Admin bootstrap completed:', {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    isActive: adminUser.isActive,
  });
}

main()
  .catch((error) => {
    console.error('❌ Admin seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

