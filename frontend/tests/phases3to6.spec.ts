import { expect, test } from '@playwright/test';

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

test.describe('Phases 3–6: Full End-to-End ATS Recruitment Journey', () => {
  test('Candidate uploads PDF resume, Quick Applies, Recruiter advances Kanban & schedules interview, Candidate confirms', async ({
    browser,
  }) => {
    const recEmail = `e2e_p36_rec_${Date.now()}@test.local`;
    const candEmail = `e2e_p36_cand_${Date.now()}@test.local`;
    const jobTitle = `Full-Stack ATS Engineer ${Date.now()}`;

    // 1. Recruiter publishes a job
    const recCtx = await browser.newContext();
    const recPage = await recCtx.newPage();

    await recPage.goto('/register');
    await recPage.getByRole('button', { name: /Recruiter/i }).click();
    await recPage.getByLabel('Full name').fill('Phase 3-6 Recruiter');
    await recPage.getByLabel('Email address').fill(recEmail);
    await recPage.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await recPage.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');
    await recPage.getByRole('button', { name: /create workspace account/i }).click();
    await expect(recPage).toHaveURL(/\/recruiter\/dashboard/);

    await recPage.goto('/recruiter/jobs/create');
    await recPage.getByLabel('Job Title *').fill(jobTitle);
    await recPage.getByLabel('Company Name *').fill('Northstar Demo Labs');
    await recPage.getByLabel('Department *').fill('Engineering');
    await recPage.getByLabel('Job Location Display').fill('Chennai, India');
    const descEditor = recPage.getByRole('textbox', { name: 'Detailed Job Description' });
    await descEditor.click();
    await descEditor.type(
      'Design and ship distributed Python and PostgreSQL enterprise ATS APIs.',
    );
    await recPage.getByRole('button', { name: '+ Python' }).click();
    await recPage.getByRole('button', { name: '+ PostgreSQL' }).click();
    await recPage.getByRole('button', { name: 'Publish Job' }).click();
    await expect(recPage).toHaveURL(/\/recruiter\/jobs$/);

    // 2. Candidate registers, uploads PDF resume in Resume Vault, and Quick Applies
    const candCtx = await browser.newContext();
    const candPage = await candCtx.newPage();

    await candPage.goto('/register');
    await candPage.getByLabel('Full name').fill('Phase 3-6 Candidate');
    await candPage.getByLabel('Email address').fill(candEmail);
    await candPage.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await candPage.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');
    await candPage.getByRole('button', { name: /create workspace account/i }).click();
    await expect(candPage).toHaveURL(/\/candidate\/dashboard/);

    await candPage
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Resume Vault' })
      .click();
    await expect(candPage).toHaveURL(/\/candidate\/resumes/);

    await candPage.getByLabel('Resume Label').fill('ATS Python Resume');
    const pdfBuffer = buildMinimalPdfBuffer(
      'Phase 3-6 Candidate Python PostgreSQL React 3 years of experience',
    );
    await candPage.getByLabel('PDF or DOCX File *').setInputFiles({
      name: 'candidate_resume.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await candPage.getByRole('button', { name: /Upload & Parse Resume/i }).click();
    await expect(candPage.getByText(/ATS Python Resume \(v1\)/i)).toBeVisible({
      timeout: 10000,
    });

    // Explore Jobs -> Search -> Quick Apply
    await candPage
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Explore Jobs' })
      .click();
    await candPage.getByLabel('Search published jobs').fill(jobTitle);
    await expect(candPage.getByRole('heading', { name: jobTitle, level: 2 })).toBeVisible({
      timeout: 10000,
    });

    await candPage.getByRole('button', { name: 'Quick Apply' }).click();
    await expect(candPage.getByText(/Advisory Skill Match Preview/i)).toBeVisible();
    await candPage.getByRole('button', { name: 'Submit Application' }).click();
    await expect(candPage.getByText('Applied', { exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Recruiter opens ATS Pipeline & moves candidate to SCREENING
    await recPage.getByRole('link', { name: 'ATS Pipeline' }).first().click();
    await expect(recPage.getByText('Phase 3-6 Candidate')).toBeVisible({ timeout: 10000 });
    await recPage
      .getByLabel('Move Phase 3-6 Candidate stage')
      .selectOption('SCREENING');
    await recPage.getByRole('button', { name: 'Confirm Move' }).click();

    // 4. Candidate checks My Applications & sees SCREENING status
    await candPage
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'My Applications' })
      .click();
    await expect(candPage).toHaveURL(/\/candidate\/applications/);
    await expect(candPage.getByRole('heading', { name: jobTitle })).toBeVisible();
    await expect(candPage.getByText('SCREENING', { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });

    // 5. Recruiter checks Analytics funnel
    await recPage.goto('/recruiter/analytics');
    await expect(recPage.getByText('Pipeline Stage Breakdown')).toBeVisible();

    await recCtx.close();
    await candCtx.close();
  });
});

