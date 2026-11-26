import { UserRole } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/prisma/client';
import { getAdminUserStats } from '../src/services/admin.service';
import { hashPassword } from '../src/utils/crypto';

describe('PostgreSQL Schema, Constraints & Relationships', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Clean up in FK-safe order
    if (createdUserIds.length > 0) {
      await prisma.evaluation.deleteMany({ where: { reviewerId: { in: createdUserIds } } });
      await prisma.application.deleteMany({ where: { candidateId: { in: createdUserIds } } });
      await prisma.job.deleteMany({ where: { recruiterId: { in: createdUserIds } } });
      await prisma.resume.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it('stores Argon2id password hashes and enforces email uniqueness', async () => {
    const email = `db_user_${Date.now()}@test.local`;
    const passwordHash = await hashPassword('StrongPass!123');
    expect(passwordHash.startsWith('$argon2id$')).toBe(true);

    const user = await prisma.user.create({
      data: {
        fullName: 'DB Test User',
        email,
        passwordHash,
        role: UserRole.CANDIDATE,
      },
    });
    createdUserIds.push(user.id);

    await expect(
      prisma.user.create({
        data: {
          fullName: 'Duplicate Email',
          email,
          passwordHash,
          role: UserRole.CANDIDATE,
        },
      }),
    ).rejects.toThrow();
  });

  it('supports all 5 core tables with foreign keys, unique application constraint, and CHECK constraints', async () => {
    const pwHash = await hashPassword('StrongPass!123');
    const recruiter = await prisma.user.create({
      data: {
        fullName: 'DB Recruiter',
        email: `db_rec_${Date.now()}@test.local`,
        passwordHash: pwHash,
        role: UserRole.RECRUITER,
      },
    });
    const candidate = await prisma.user.create({
      data: {
        fullName: 'DB Candidate',
        email: `db_cand_${Date.now()}@test.local`,
        passwordHash: pwHash,
        role: UserRole.CANDIDATE,
      },
    });
    createdUserIds.push(recruiter.id, candidate.id);

    const resume = await prisma.resume.create({
      data: {
        userId: candidate.id,
        title: 'Backend Engineer Resume',
        skills: ['TypeScript', 'PostgreSQL'],
        isDefault: true,
        version: 1,
      },
    });

    const job = await prisma.job.create({
      data: {
        recruiterId: recruiter.id,
        company: 'TalentForge Corp',
        title: 'Senior Full-Stack Engineer',
        description: 'Build enterprise ATS systems.',
        requiredSkills: ['TypeScript', 'Next.js', 'PostgreSQL'],
      },
    });

    const application = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        resumeId: resume.id,
        matchScore: 92.5,
      },
    });

    // Duplicate application for same job & candidate must fail
    await expect(
      prisma.application.create({
        data: {
          jobId: job.id,
          candidateId: candidate.id,
        },
      }),
    ).rejects.toThrow();

    // match_score outside 0-100 must fail DB check constraint
    await expect(
      prisma.$executeRaw`
        INSERT INTO applications (job_id, candidate_id, match_score, updated_at)
        VALUES (${job.id}::uuid, ${recruiter.id}::uuid, 150, NOW())
      `,
    ).rejects.toThrow(/chk_applications_match_score/);

    const evaluation = await prisma.evaluation.create({
      data: {
        applicationId: application.id,
        reviewerId: recruiter.id,
        rating: 4.5,
        notes: 'Strong architectural thinking.',
      },
    });
    expect(evaluation.id).toBeDefined();

    // rating outside 1-5 must fail DB check constraint
    await expect(
      prisma.$executeRaw`
        INSERT INTO evaluations (application_id, reviewer_id, rating, updated_at)
        VALUES (${application.id}::uuid, ${recruiter.id}::uuid, 6, NOW())
      `,
    ).rejects.toThrow(/chk_evaluations_rating/);

    const stats = await getAdminUserStats();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
  });
});

