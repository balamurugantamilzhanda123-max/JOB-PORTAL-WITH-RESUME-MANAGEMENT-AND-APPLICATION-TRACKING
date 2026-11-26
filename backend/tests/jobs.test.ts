import {
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  QuestionType,
  UserRole,
  WorkMode,
} from '@prisma/client';
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

describe('Phase 2: Job Portal, Search Engine & Bookmarks', () => {
  const recruiterAEmail = `p2_rec_a_${Date.now()}@test.local`;
  const recruiterBEmail = `p2_rec_b_${Date.now()}@test.local`;
  const candidateEmail = `p2_cand_${Date.now()}@test.local`;
  const password = 'Password!123';

  let recruiterAId = '';
  let recruiterBId = '';
  let candidateId = '';

  const recAAgent = request.agent(app);
  const recBAgent = request.agent(app);
  const candAgent = request.agent(app);

  let recACsrf = '';
  let recBCsrf = '';
  let candCsrf = '';

  beforeAll(async () => {
    const pwHash = await hashPassword(password);
    const [recA, recB, cand] = await Promise.all([
      prisma.user.create({
        data: { fullName: 'Recruiter A', email: recruiterAEmail, passwordHash: pwHash, role: UserRole.RECRUITER },
      }),
      prisma.user.create({
        data: { fullName: 'Recruiter B', email: recruiterBEmail, passwordHash: pwHash, role: UserRole.RECRUITER },
      }),
      prisma.user.create({
        data: { fullName: 'Candidate One', email: candidateEmail, passwordHash: pwHash, role: UserRole.CANDIDATE },
      }),
    ]);

    recruiterAId = recA.id;
    recruiterBId = recB.id;
    candidateId = cand.id;

    const loginA = await recAAgent.post('/api/v1/auth/login').send({ email: recruiterAEmail, password });
    recACsrf = extractCookieValue(loginA.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;

    const loginB = await recBAgent.post('/api/v1/auth/login').send({ email: recruiterBEmail, password });
    recBCsrf = extractCookieValue(loginB.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;

    const loginC = await candAgent.post('/api/v1/auth/login').send({ email: candidateEmail, password });
    candCsrf = extractCookieValue(loginC.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;
  });

  afterAll(async () => {
    await prisma.jobBookmark.deleteMany({ where: { candidateId } });
    await prisma.jobAuditLog.deleteMany({ where: { actorId: { in: [recruiterAId, recruiterBId] } } });
    await prisma.job.deleteMany({ where: { recruiterId: { in: [recruiterAId, recruiterBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [recruiterAId, recruiterBId, candidateId] } } });
  });

  it('creates a draft, sanitizes rich text, normalizes skills, enforces lifecycle & ownership', async () => {
    // 1. Create Draft with XSS attempt & duplicate skills
    const draftRes = await recAAgent
      .post('/api/v1/recruiter/jobs')
      .set('X-CSRF-Token', recACsrf)
      .send({
        title: 'Python Backend Engineer',
        company: 'Acme Cloud',
        department: 'Engineering',
        location: 'Chennai, Tamil Nadu, India',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.INTERNSHIP,
        experienceLevel: ExperienceLevel.FRESHER,
        summary: 'Work on distributed Python services.',
        description: '<p>Build scalable <strong>Python</strong> APIs and SQL pipelines.</p><script>alert("xss")</script>',
        requiredSkills: ['Python', 'python', 'SQL', 'PostgreSQL'],
        salaryMin: 35000,
        salaryMax: 50000,
        salaryCurrency: 'INR',
        salaryUndisclosed: false,
        status: JobStatus.DRAFT,
        screeningQuestions: [
          {
            title: 'Are you available for 6 months?',
            questionType: QuestionType.YES_NO,
            isRequired: true,
            options: [],
          },
        ],
      });

    expect(draftRes.status).toBe(201);
    const jobId = draftRes.body.data.job.id as string;
    expect(draftRes.body.data.job.status).toBe('DRAFT');
    expect(draftRes.body.data.job.description).not.toContain('<script>');
    expect(draftRes.body.data.job.requiredSkills).toEqual(['Python', 'SQL', 'PostgreSQL']);
    expect(draftRes.body.data.job.screeningQuestions).toHaveLength(1);

    // 2. Draft is hidden from candidate search
    const candSearchDraft = await candAgent.get('/api/v1/candidate/jobs?q=Python');
    expect(candSearchDraft.status).toBe(200);
    expect(candSearchDraft.body.data.items.some((j: { id: string }) => j.id === jobId)).toBe(false);

    // 3. Ownership check: Recruiter B cannot edit or publish Recruiter A's job
    const unauthorizedGet = await recBAgent.get(`/api/v1/recruiter/jobs/${jobId}`);
    expect(unauthorizedGet.status).toBe(403);

    const unauthorizedPublish = await recBAgent
      .patch(`/api/v1/recruiter/jobs/${jobId}/status`)
      .set('X-CSRF-Token', recBCsrf)
      .send({ status: JobStatus.PUBLISHED });
    expect(unauthorizedPublish.status).toBe(403);

    // 4. Recruiter A publishes the job
    const publishRes = await recAAgent
      .patch(`/api/v1/recruiter/jobs/${jobId}/status`)
      .set('X-CSRF-Token', recACsrf)
      .send({ status: JobStatus.PUBLISHED });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.job.status).toBe('PUBLISHED');
    expect(publishRes.body.data.job.publishedAt).toBeTruthy();
    expect(publishRes.body.data.job.auditLogs.length).toBeGreaterThanOrEqual(2);

    // 5. Combined Search + Filters find the published job
    const searchRes = await candAgent.get(
      '/api/v1/candidate/jobs?q=Python&location=Chennai&workMode=HYBRID&employmentType=INTERNSHIP&skills=Python,SQL&skillsMatch=ALL',
    );
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.items.some((j: { id: string }) => j.id === jobId)).toBe(true);

    // 6. Candidate bookmarks the job, duplicate bookmark rejected
    const bmRes = await candAgent
      .post(`/api/v1/candidate/bookmarks/${jobId}`)
      .set('X-CSRF-Token', candCsrf);
    expect(bmRes.status).toBe(201);

    const dupBmRes = await candAgent
      .post(`/api/v1/candidate/bookmarks/${jobId}`)
      .set('X-CSRF-Token', candCsrf);
    expect(dupBmRes.status).toBe(409);

    // 7. Recruiter pauses job -> hidden from search, preserved in saved jobs as unavailable
    const pauseRes = await recAAgent
      .patch(`/api/v1/recruiter/jobs/${jobId}/status`)
      .set('X-CSRF-Token', recACsrf)
      .send({ status: JobStatus.PAUSED });
    expect(pauseRes.status).toBe(200);

    const searchAfterPause = await candAgent.get('/api/v1/candidate/jobs?q=Python');
    expect(searchAfterPause.body.data.items.some((j: { id: string }) => j.id === jobId)).toBe(false);

    const savedJobsRes = await candAgent.get('/api/v1/candidate/bookmarks');
    expect(savedJobsRes.status).toBe(200);
    const savedItem = savedJobsRes.body.data.bookmarks.find(
      (b: { job: { id: string } }) => b.job.id === jobId,
    );
    expect(savedItem).toBeDefined();
    expect(savedItem.isUnavailable).toBe(true);
    expect(savedItem.job.status).toBe('PAUSED');

    // 8. Close job and confirm transition out of CLOSED is rejected
    const closeRes = await recAAgent
      .patch(`/api/v1/recruiter/jobs/${jobId}/status`)
      .set('X-CSRF-Token', recACsrf)
      .send({ status: JobStatus.CLOSED });
    expect(closeRes.status).toBe(200);

    const reopenRes = await recAAgent
      .patch(`/api/v1/recruiter/jobs/${jobId}/status`)
      .set('X-CSRF-Token', recACsrf)
      .send({ status: JobStatus.PUBLISHED });
    expect(reopenRes.status).toBe(400);

    // 9. Candidate removes bookmark
    const delBmRes = await candAgent
      .delete(`/api/v1/candidate/bookmarks/${jobId}`)
      .set('X-CSRF-Token', candCsrf);
    expect(delBmRes.status).toBe(200);
  });

  it('handles undisclosed salary properly without treating it as zero', async () => {
    const undisclosedRes = await recAAgent
      .post('/api/v1/recruiter/jobs')
      .set('X-CSRF-Token', recACsrf)
      .send({
        title: 'Undisclosed Role Engineer',
        company: 'Stealth Labs',
        department: 'Engineering',
        location: 'Remote',
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.THREE_TO_FIVE_YEARS,
        description: '<p>Confidential compensation package with strong equity upside.</p>',
        requiredSkills: ['TypeScript', 'Node.js'],
        salaryUndisclosed: true,
        status: JobStatus.PUBLISHED,
      });

    expect(undisclosedRes.status).toBe(201);
    const undisclosedId = undisclosedRes.body.data.job.id as string;

    // Filtering by salaryMin=0 or salaryMax=100000 must NOT match undisclosed salary as 0
    const filtered = await candAgent.get(
      '/api/v1/candidate/jobs?q=Undisclosed&salaryMin=0&salaryMax=100000',
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items.some((j: { id: string }) => j.id === undisclosedId)).toBe(false);
  });
});

