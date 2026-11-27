import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma/client';
import { hashPassword } from '../src/utils/crypto';

const app = createApp();

function extractCookieValue(setCookies: string[] | undefined, name: string): string | undefined {
  if (!setCookies) return undefined;
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(';')[0].slice(name.length + 1);
}

describe('Master Prompt Completion: Profile, Password, Sessions, Preferences, Retention & System Health', () => {
  const createdUserIds: string[] = [];
  const createdRetentionIds: string[] = [];

  let candidateEmail = '';
  let adminEmail = '';
  const initialPassword = 'SpecUser!2026#';
  const rotatedPassword = 'SpecUserNew!2026#';

  beforeAll(async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    candidateEmail = `mp_candidate_${suffix}@test.local`;
    adminEmail = `mp_admin_${suffix}@test.local`;

    const pwHash = await hashPassword(initialPassword);
    const [cand, adm] = await Promise.all([
      prisma.user.create({
        data: {
          fullName: 'Master Prompt Candidate',
          email: candidateEmail,
          passwordHash: pwHash,
          role: UserRole.CANDIDATE,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          fullName: 'Master Prompt Admin',
          email: adminEmail,
          passwordHash: pwHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
      }),
    ]);

    createdUserIds.push(cand.id, adm.id);
  });

  afterAll(async () => {
    await prisma.retentionJob
      .deleteMany({ where: { id: { in: createdRetentionIds } } })
      .catch(() => undefined);
    await prisma.user
      .deleteMany({ where: { id: { in: createdUserIds } } })
      .catch(() => undefined);
  });

  it('persists candidate profile, notification prefs, password rotation & session controls, and enforces admin retention holds', async () => {
    const candAgent = request.agent(app);
    const candSecondAgent = request.agent(app);
    const adminAgent = request.agent(app);

    const loginRes1 = await candAgent.post('/api/v1/auth/login').send({
      email: candidateEmail,
      password: initialPassword,
    });
    expect(loginRes1.status).toBe(200);
    const candCsrf1 = extractCookieValue(
      loginRes1.headers['set-cookie'] as string[] | undefined,
      'ats_csrf_token',
    )!;

    const loginRes2 = await candSecondAgent.post('/api/v1/auth/login').send({
      email: candidateEmail,
      password: initialPassword,
    });
    expect(loginRes2.status).toBe(200);

    // Profile update + read
    const patchProfile = await candAgent
      .patch('/api/v1/auth/profile')
      .set('X-CSRF-Token', candCsrf1)
      .send({
        headline: 'Backend Platform Engineer',
        location: 'Chennai, India',
        skills: ['TypeScript', 'PostgreSQL', 'Express'],
        profileVisible: true,
      });
    expect(patchProfile.status).toBe(200);
    expect(patchProfile.body.data.profile.headline).toBe('Backend Platform Engineer');

    // Notification preferences
    const patchPrefs = await candAgent
      .patch('/api/v1/notifications/preferences')
      .set('X-CSRF-Token', candCsrf1)
      .send({ emailNotifications: true, marketingUpdates: true });
    expect(patchPrefs.status).toBe(200);
    expect(patchPrefs.body.data.preferences.marketingUpdates).toBe(true);

    // Sessions list before password change
    const sessionsBefore = await candAgent.get('/api/v1/auth/sessions');
    expect(sessionsBefore.status).toBe(200);
    expect(sessionsBefore.body.data.sessions.length).toBeGreaterThanOrEqual(2);

    // Password change revokes second session
    const changePwRes = await candAgent
      .patch('/api/v1/auth/password')
      .set('X-CSRF-Token', candCsrf1)
      .send({
        currentPassword: initialPassword,
        newPassword: rotatedPassword,
        confirmPassword: rotatedPassword,
      });
    expect(changePwRes.status).toBe(200);

    // Second session should now fail /auth/me
    const revokedCheck = await candSecondAgent.get('/api/v1/auth/me');
    expect(revokedCheck.status).toBe(401);

    // Candidate cannot access admin retention/system endpoints
    const forbiddenRet = await candAgent.get('/api/v1/admin/retention');
    expect(forbiddenRet.status).toBe(403);
    const forbiddenSys = await candAgent.get('/api/v1/admin/system');
    expect(forbiddenSys.status).toBe(403);

    // Admin logs in
    const adminLogin = await adminAgent.post('/api/v1/auth/login').send({
      email: adminEmail,
      password: initialPassword,
    });
    expect(adminLogin.status).toBe(200);
    const adminCsrf = extractCookieValue(
      adminLogin.headers['set-cookie'] as string[] | undefined,
      'ats_csrf_token',
    )!;

    // System diagnostics
    const sysRes = await adminAgent.get('/api/v1/admin/system');
    expect(sysRes.status).toBe(200);
    expect(sysRes.body.data.database.status).toBe('connected');

    // Retention create + hold blocks execute + release + execute
    const createRet = await adminAgent
      .post('/api/v1/admin/retention')
      .set('X-CSRF-Token', adminCsrf)
      .send({
        subjectType: 'AuthSession',
        subjectId: 'expired-sessions-batch',
        policyKey: 'expired_sessions_30d',
        holdReason: 'Active compliance review',
      });
    expect(createRet.status).toBe(201);
    const retentionId = createRet.body.data.job.id as string;
    createdRetentionIds.push(retentionId);
    expect(createRet.body.data.job.status).toBe('ON_HOLD');

    const blockedExec = await adminAgent
      .post(`/api/v1/admin/retention/${retentionId}/execute`)
      .set('X-CSRF-Token', adminCsrf);
    expect(blockedExec.status).toBe(400);

    const releaseHold = await adminAgent
      .patch(`/api/v1/admin/retention/${retentionId}/hold`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ hold: false });
    expect(releaseHold.status).toBe(200);
    expect(releaseHold.body.data.job.status).toBe('SCHEDULED');

    const executed = await adminAgent
      .post(`/api/v1/admin/retention/${retentionId}/execute`)
      .set('X-CSRF-Token', adminCsrf);
    expect(executed.status).toBe(200);
    expect(executed.body.data.job.status).toBe('EXECUTED');
  });
});
