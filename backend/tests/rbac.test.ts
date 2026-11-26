import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma/client';
import { hashPassword } from '../src/utils/crypto';

const app = createApp();

describe('Role-Based Access Control (RBAC)', () => {
  const candidateEmail = `rbac_candidate_${Date.now()}@test.local`;
  const recruiterEmail = `rbac_recruiter_${Date.now()}@test.local`;
  const adminEmail = `rbac_admin_${Date.now()}@test.local`;
  const password = 'Password!123';

  beforeAll(async () => {
    const pwHash = await hashPassword(password);
    await prisma.user.createMany({
      data: [
        { fullName: 'RBAC Candidate', email: candidateEmail, passwordHash: pwHash, role: UserRole.CANDIDATE },
        { fullName: 'RBAC Recruiter', email: recruiterEmail, passwordHash: pwHash, role: UserRole.RECRUITER },
        { fullName: 'RBAC Admin', email: adminEmail, passwordHash: pwHash, role: UserRole.ADMIN },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [candidateEmail, recruiterEmail, adminEmail] } },
    });
  });

  it('rejects unauthenticated requests to all protected endpoints', async () => {
    const endpoints = [
      '/api/v1/auth/me',
      '/api/v1/candidate/dashboard',
      '/api/v1/recruiter/dashboard',
      '/api/v1/admin/dashboard',
      '/api/v1/admin/users/stats',
    ];

    for (const url of endpoints) {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    }
  });

  it('enforces Candidate RBAC strictly', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: candidateEmail, password });

    expect((await agent.get('/api/v1/candidate/dashboard')).status).toBe(200);
    expect((await agent.get('/api/v1/recruiter/dashboard')).status).toBe(403);
    expect((await agent.get('/api/v1/admin/dashboard')).status).toBe(403);
    expect((await agent.get('/api/v1/admin/users/stats')).status).toBe(403);
  });

  it('enforces Recruiter RBAC strictly', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: recruiterEmail, password });

    expect((await agent.get('/api/v1/recruiter/dashboard')).status).toBe(200);
    expect((await agent.get('/api/v1/candidate/dashboard')).status).toBe(403);
    expect((await agent.get('/api/v1/admin/dashboard')).status).toBe(403);
  });

  it('enforces Admin RBAC strictly and returns real user stats', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: adminEmail, password });

    const dashRes = await agent.get('/api/v1/admin/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.stats.totalUsers).toBeGreaterThanOrEqual(3);

    const statsRes = await agent.get('/api/v1/admin/users/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.candidateCount).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.data.recruiterCount).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.data.adminCount).toBeGreaterThanOrEqual(1);

    // Admin cannot access candidate/recruiter-only dashboards
    expect((await agent.get('/api/v1/candidate/dashboard')).status).toBe(403);
    expect((await agent.get('/api/v1/recruiter/dashboard')).status).toBe(403);
  });

  it('reflects database role changes immediately in subsequent authorization checks', async () => {
    const dynamicEmail = `dynamic_role_${Date.now()}@test.local`;
    const pwHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName: 'Dynamic Role User',
        email: dynamicEmail,
        passwordHash: pwHash,
        role: UserRole.CANDIDATE,
      },
    });

    try {
      const agent = request.agent(app);
      await agent.post('/api/v1/auth/login').send({ email: dynamicEmail, password });

      expect((await agent.get('/api/v1/candidate/dashboard')).status).toBe(200);
      expect((await agent.get('/api/v1/recruiter/dashboard')).status).toBe(403);

      // Update role directly in PostgreSQL
      await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.RECRUITER },
      });

      // Immediately reflected without re-login
      expect((await agent.get('/api/v1/candidate/dashboard')).status).toBe(403);
      expect((await agent.get('/api/v1/recruiter/dashboard')).status).toBe(200);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});

