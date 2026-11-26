import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma/client';

const app = createApp();

function extractCookieValue(setCookies: string[] | undefined, name: string): string | undefined {
  if (!setCookies) return undefined;
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(';')[0].slice(name.length + 1);
}

describe('Authentication API (Phase 1)', () => {
  const testEmails: string[] = [];

  afterEach(async () => {
    if (testEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: testEmails } },
      });
      testEmails.length = 0;
    }
  });

  it('registers a new Candidate successfully and sets HttpOnly cookies', async () => {
    const email = `candidate_${Date.now()}@test.local`;
    testEmails.push(email);

    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Alice Candidate',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('CANDIDATE');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toBeUndefined();

    const setCookies = res.headers['set-cookie'] as unknown as string[];
    expect(setCookies.some((c) => c.startsWith('ats_access_token=') && c.includes('HttpOnly'))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('ats_refresh_token=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('registers a new Recruiter successfully', async () => {
    const email = `recruiter_${Date.now()}@test.local`;
    testEmails.push(email);

    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Bob Recruiter',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'RECRUITER',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('RECRUITER');
  });

  it('rejects duplicate email registration with 409 Conflict', async () => {
    const email = `dup_${Date.now()}@test.local`;
    testEmails.push(email);

    await request(app).post('/api/v1/auth/register').send({
      fullName: 'First User',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'CANDIDATE',
    });

    const dupRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Second User',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'CANDIDATE',
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('rejects invalid email, weak passwords, and mismatched passwords', async () => {
    const invalidEmailRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'not-an-email',
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'CANDIDATE',
    });
    expect(invalidEmailRes.status).toBe(400);

    const weakPwRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'weak@test.local',
      password: 'password',
      confirmPassword: 'password',
      role: 'CANDIDATE',
    });
    expect(weakPwRes.status).toBe(400);

    const mismatchRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'mismatch@test.local',
      password: 'Password!123',
      confirmPassword: 'Password!999',
      role: 'CANDIDATE',
    });
    expect(mismatchRes.status).toBe(400);
  });

  it('blocks public ADMIN self-registration with 403 Forbidden', async () => {
    const email = `bad_admin_${Date.now()}@test.local`;
    testEmails.push(email);

    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Sneaky Admin',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'ADMIN',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('logs in with valid credentials, rejects invalid password, rotates refresh token, and revokes on logout', async () => {
    const email = `login_flow_${Date.now()}@test.local`;
    testEmails.push(email);

    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Flow User',
      email,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: 'CANDIDATE',
    });

    // Invalid password
    const badLogin = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'WrongPassword!1',
    });
    expect(badLogin.status).toBe(401);

    // Valid login
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({
      email,
      password: 'Password!123',
      rememberMe: true,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe(email);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const csrf1 = extractCookieValue(cookies, 'ats_csrf_token')!;

    // Verify /auth/me works with cookie
    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);

    // Refresh token rotation
    const refreshRes = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrf1);
    expect(refreshRes.status).toBe(200);

    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const csrf2 = extractCookieValue(newCookies, 'ats_csrf_token')!;

    // Logout revokes session
    const logoutRes = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrf2);
    expect(logoutRes.status).toBe(200);

    // Subsequent /auth/me fails after logout
    const afterLogoutMe = await agent.get('/api/v1/auth/me');
    expect(afterLogoutMe.status).toBe(401);
  });
});

