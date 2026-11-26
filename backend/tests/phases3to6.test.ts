import {
  ApplicationStage,
  CompanyVerificationStatus,
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

/**
 * Generates a minimal valid single-page PDF buffer containing the given ASCII text.
 */
function buildMinimalPdfBuffer(text: string): Buffer {
  const safeText = text.replace(/[()\\]/g, ' ');
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${safeText}) Tj\nET\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

describe('Phases 3–6: Resume Vault, Applications, ATS Pipeline, Interviews, Scorecards & Analytics', () => {
  const recEmail = `p36_rec_${Date.now()}@test.local`;
  const otherRecEmail = `p36_rec2_${Date.now()}@test.local`;
  const candEmail = `p36_cand_${Date.now()}@test.local`;
  const otherCandEmail = `p36_cand2_${Date.now()}@test.local`;
  const adminEmail = `p36_admin_${Date.now()}@test.local`;
  const password = 'Password!123';

  let recId = '';
  let otherRecId = '';
  let candId = '';
  let otherCandId = '';
  let adminId = '';

  const recAgent = request.agent(app);
  const otherRecAgent = request.agent(app);
  const candAgent = request.agent(app);
  const otherCandAgent = request.agent(app);
  const adminAgent = request.agent(app);

  let recCsrf = '';
  let candCsrf = '';
  let adminCsrf = '';

  beforeAll(async () => {
    const pwHash = await hashPassword(password);
    const [r1, r2, c1, c2, adm] = await Promise.all([
      prisma.user.create({
        data: { fullName: 'Recruiter One', email: recEmail, passwordHash: pwHash, role: UserRole.RECRUITER },
      }),
      prisma.user.create({
        data: { fullName: 'Recruiter Two', email: otherRecEmail, passwordHash: pwHash, role: UserRole.RECRUITER },
      }),
      prisma.user.create({
        data: { fullName: 'Candidate One', email: candEmail, passwordHash: pwHash, role: UserRole.CANDIDATE },
      }),
      prisma.user.create({
        data: { fullName: 'Candidate Two', email: otherCandEmail, passwordHash: pwHash, role: UserRole.CANDIDATE },
      }),
      prisma.user.create({
        data: { fullName: 'Admin One', email: adminEmail, passwordHash: pwHash, role: UserRole.ADMIN },
      }),
    ]);

    recId = r1.id;
    otherRecId = r2.id;
    candId = c1.id;
    otherCandId = c2.id;
    adminId = adm.id;

    const lRec = await recAgent.post('/api/v1/auth/login').send({ email: recEmail, password });
    recCsrf = extractCookieValue(lRec.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;

    await otherRecAgent.post('/api/v1/auth/login').send({ email: otherRecEmail, password });

    const lCand = await candAgent.post('/api/v1/auth/login').send({ email: candEmail, password });
    candCsrf = extractCookieValue(lCand.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;

    await otherCandAgent.post('/api/v1/auth/login').send({ email: otherCandEmail, password });

    const lAdm = await adminAgent.post('/api/v1/auth/login').send({ email: adminEmail, password });
    adminCsrf = extractCookieValue(lAdm.headers['set-cookie'] as unknown as string[], 'ats_csrf_token')!;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [recId, otherRecId, candId, otherCandId, adminId] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [recId, otherRecId, candId, otherCandId, adminId] } },
    });
    await prisma.evaluation.deleteMany({ where: { reviewerId: { in: [recId, otherRecId] } } });
    await prisma.interview.deleteMany({ where: { organizerId: { in: [recId, otherRecId] } } });
    await prisma.application.deleteMany({ where: { candidateId: { in: [candId, otherCandId] } } });
    await prisma.resume.deleteMany({ where: { userId: { in: [candId, otherCandId] } } });
    await prisma.company.deleteMany({ where: { ownerId: { in: [recId, otherRecId] } } });
    await prisma.job.deleteMany({ where: { recruiterId: { in: [recId, otherRecId] } } });
    await prisma.user.deleteMany({
      where: { id: { in: [recId, otherRecId, candId, otherCandId, adminId] } },
    });
  });

  it('executes full end-to-end ATS flow across Phases 3, 4, 5, and 6', async () => {
    // 1. Recruiter publishes a job with screening question
    const jobRes = await recAgent
      .post('/api/v1/recruiter/jobs')
      .set('X-CSRF-Token', recCsrf)
      .send({
        title: 'Senior Python & SQL Architect',
        company: 'Northstar Test Corp',
        department: 'Engineering',
        location: 'Chennai, India',
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.THREE_TO_FIVE_YEARS,
        description: '<p>Architect distributed Python and PostgreSQL backends at scale.</p>',
        requiredSkills: ['Python', 'PostgreSQL', 'Docker'],
        salaryMin: 1200000,
        salaryMax: 1800000,
        salaryCurrency: 'INR',
        status: JobStatus.PUBLISHED,
        screeningQuestions: [
          {
            title: 'Years of PostgreSQL production experience?',
            questionType: QuestionType.SHORT_TEXT,
            isRequired: true,
            options: [],
          },
        ],
      });

    expect(jobRes.status).toBe(201);
    const jobId = jobRes.body.data.job.id as string;
    const questionId = jobRes.body.data.job.screeningQuestions[0].id as string;

    // 2. Phase 3: Reject forged PDF file signature
    const badPdfRes = await candAgent
      .post('/api/v1/candidate/resumes/upload')
      .set('X-CSRF-Token', candCsrf)
      .field('title', 'Fake PDF')
      .attach('file', Buffer.from('not a real pdf'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });
    expect(badPdfRes.status).toBe(400);

    // 3. Phase 3: Upload real PDF resume & parse skills
    const pdfBuf = buildMinimalPdfBuffer(
      'S Balamurugan Python PostgreSQL TypeScript 4 years of experience B.Tech Computer Science',
    );
    const uploadRes = await candAgent
      .post('/api/v1/candidate/resumes/upload')
      .set('X-CSRF-Token', candCsrf)
      .field('title', 'Backend Resume v1')
      .attach('file', pdfBuf, {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(uploadRes.status).toBe(201);
    const resumeId = uploadRes.body.data.resume.id as string;
    expect(uploadRes.body.data.resume.version).toBe(1);
    expect(uploadRes.body.data.resume.isDefault).toBe(true);
    expect(uploadRes.body.data.resume.skills).toEqual(
      expect.arrayContaining(['Python', 'PostgreSQL']),
    );

    // Protected file access: other candidate cannot download
    const otherDownload = await otherCandAgent.get(`/api/v1/resumes/${resumeId}/download`);
    expect(otherDownload.status).toBe(403);

    // Owner candidate can download
    const ownerDownload = await candAgent.get(`/api/v1/resumes/${resumeId}/download`);
    expect(ownerDownload.status).toBe(200);

    // Readiness keyword-gap check
    const readinessRes = await candAgent.get(
      `/api/v1/candidate/jobs/${jobId}/resume-readiness?resumeId=${resumeId}`,
    );
    expect(readinessRes.status).toBe(200);
    expect(readinessRes.body.data.readiness.requiredSkillCoverage.matchedSkills).toEqual(
      expect.arrayContaining(['Python', 'PostgreSQL']),
    );
    expect(readinessRes.body.data.readiness.requiredSkillCoverage.missingSkills).toContain('Docker');

    // 4. Phase 4: Candidate submits application with immutable resume snapshot & idempotency
    const idemKey = `idem-${Date.now()}`;
    const applyRes = await candAgent
      .post(`/api/v1/candidate/jobs/${jobId}/applications`)
      .set('X-CSRF-Token', candCsrf)
      .send({
        resumeId,
        idempotencyKey: idemKey,
        coverNote: 'Excited to contribute to Northstar.',
        screeningAnswers: [{ questionId, answer: '4 years in production fintech systems' }],
      });

    expect(applyRes.status).toBe(201);
    const applicationId = applyRes.body.data.application.id as string;
    expect(Number(applyRes.body.data.application.matchScore)).toBeGreaterThan(50);

    // Idempotent retry returns same application without 409/duplicate
    const retryRes = await candAgent
      .post(`/api/v1/candidate/jobs/${jobId}/applications`)
      .set('X-CSRF-Token', candCsrf)
      .send({
        resumeId,
        idempotencyKey: idemKey,
        screeningAnswers: [{ questionId, answer: '4 years in production fintech systems' }],
      });
    expect(retryRes.status).toBe(201);
    expect(retryRes.body.data.application.id).toBe(applicationId);

    // Duplicate application with new key is rejected with 409
    const dupApplyRes = await candAgent
      .post(`/api/v1/candidate/jobs/${jobId}/applications`)
      .set('X-CSRF-Token', candCsrf)
      .send({
        resumeId,
        screeningAnswers: [{ questionId, answer: '4 years' }],
      });
    expect(dupApplyRes.status).toBe(409);

    // Tenant isolation: Recruiter Two cannot view Recruiter One's applicants
    const otherRecApps = await otherRecAgent.get(`/api/v1/recruiter/jobs/${jobId}/applicants`);
    expect(otherRecApps.status).toBe(403);

    // Recruiter One CAN download the applicant's resume
    const recDownload = await recAgent.get(`/api/v1/resumes/${resumeId}/download`);
    expect(recDownload.status).toBe(200);

    // 5. Phase 4: Recruiter transitions stage APPLIED -> SCREENING with internal note
    const stageRes = await recAgent
      .patch(`/api/v1/recruiter/applications/${applicationId}/stage`)
      .set('X-CSRF-Token', recCsrf)
      .send({
        stage: ApplicationStage.SCREENING,
        publicNote: 'Moving to initial technical screening.',
        internalNote: 'CONFIDENTIAL: Strong SQL depth, probe Docker in interview.',
      });
    expect(stageRes.status).toBe(200);

    // Candidate tracker never leaks internalNote
    const candAppDetail = await candAgent.get(`/api/v1/candidate/applications/${applicationId}`);
    expect(candAppDetail.status).toBe(200);
    expect(JSON.stringify(candAppDetail.body.data.application)).not.toContain('CONFIDENTIAL');

    // 6. Phase 5: Recruiter proposes interview -> Candidate accepts -> Recruiter submits scorecard
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    const ivRes = await recAgent
      .post(`/api/v1/recruiter/applications/${applicationId}/interviews`)
      .set('X-CSRF-Token', recCsrf)
      .send({
        roundTitle: 'Backend Architecture Round',
        interviewType: 'Technical',
        startAt,
        endAt,
        timezone: 'Asia/Kolkata',
        meetingUrl: 'https://meet.example.test/round-1',
        instructions: 'Prepare to discuss PostgreSQL indexing.',
      });
    expect(ivRes.status).toBe(201);
    const interviewId = ivRes.body.data.interview.id as string;

    // Candidate accepts interview
    const respondRes = await candAgent
      .post(`/api/v1/candidate/interviews/${interviewId}/respond`)
      .set('X-CSRF-Token', candCsrf)
      .send({ response: 'ACCEPTED', note: 'Looking forward to it.' });
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.data.interview.status).toBe('CONFIRMED');

    // Candidate checks notifications
    const notifRes = await candAgent.get('/api/v1/notifications');
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.unreadCount).toBeGreaterThanOrEqual(2);

    // Recruiter submits private scorecard
    const evalRes = await recAgent
      .post(`/api/v1/recruiter/applications/${applicationId}/evaluations`)
      .set('X-CSRF-Token', recCsrf)
      .send({
        interviewId,
        rating: 4.5,
        recommendation: 'YES',
        notes: 'PRIVATE SCORECARD: Clear PostgreSQL partitioning rationale.',
        isCandidateVisible: false,
        criteria: {
          technicalSkills: 5,
          problemSolving: 4,
          communication: 4,
          roleFit: 5,
        },
      });
    expect(evalRes.status).toBe(201);

    // Candidate cannot read private evaluation notes
    const candEvalRes = await candAgent.get(`/api/v1/evaluations/application/${applicationId}`);
    expect(candEvalRes.status).toBe(200);
    expect(candEvalRes.body.data.evaluations).toHaveLength(0);

    // 7. Phase 6: Company verification, audit logs & funnel analytics
    const companyRes = await recAgent
      .put('/api/v1/recruiter/company')
      .set('X-CSRF-Token', recCsrf)
      .send({
        legalName: 'Northstar Test Corp Pvt Ltd',
        displayName: 'Northstar Test Corp',
        industry: 'Fintech',
        headquarters: 'Chennai',
      });
    expect(companyRes.status).toBe(200);
    const companyId = companyRes.body.data.company.id as string;

    const verifyRes = await adminAgent
      .patch(`/api/v1/admin/companies/${companyId}/verify`)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        status: CompanyVerificationStatus.VERIFIED,
        reason: 'Verified domain and corporate profile.',
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.company.verificationStatus).toBe('VERIFIED');

    const auditRes = await adminAgent.get('/api/v1/admin/audit-logs');
    expect(auditRes.status).toBe(200);
    expect(
      auditRes.body.data.logs.some(
        (l: { action: string }) => l.action === 'COMPANY_VERIFICATION_DECISION',
      ),
    ).toBe(true);

    const funnelRes = await recAgent.get('/api/v1/analytics/funnel');
    expect(funnelRes.status).toBe(200);
    expect(funnelRes.body.data.totals.totalApplications).toBeGreaterThanOrEqual(1);
    expect(funnelRes.body.data.totals.interviewsCount).toBeGreaterThanOrEqual(1);
  });
});

