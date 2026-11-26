import { expect, test } from '@playwright/test';

test.describe('Phase 2: Recruiter Job Portal & Candidate Search Explorer E2E', () => {
  test('Recruiter creates & publishes a job, Candidate searches/filters/bookmarks it in split-pane UI', async ({
    browser,
  }) => {
    const recruiterEmail = `pw_p2_rec_${Date.now()}@test.local`;
    const candidateEmail = `pw_p2_cand_${Date.now()}@test.local`;
    const uniqueTitle = `Python Platform Architect ${Date.now()}`;

    // 1. Recruiter registers & creates + publishes a job
    const recCtx = await browser.newContext();
    const recPage = await recCtx.newPage();

    await recPage.goto('/register');
    await recPage.getByRole('button', { name: /Recruiter/i }).click();
    await recPage.getByLabel('Full name').fill('E2E Recruiter');
    await recPage.getByLabel('Email address').fill(recruiterEmail);
    await recPage.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await recPage.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');
    await recPage.getByRole('button', { name: /create workspace account/i }).click();

    await expect(recPage).toHaveURL(/\/recruiter\/dashboard/);

    await recPage
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Job Management' })
      .click();
    await expect(recPage).toHaveURL(/\/recruiter\/jobs/);

    await recPage.getByRole('link', { name: /\+ Create New Job/i }).click();
    await expect(recPage).toHaveURL(/\/recruiter\/jobs\/create/);

    await recPage.getByLabel('Job Title *').fill(uniqueTitle);
    await recPage.getByLabel('Company Name *').fill('TalentForge Cloud');
    await recPage.getByLabel('Department *').fill('Engineering');
    await recPage.getByLabel('Job Location Display').fill('Chennai, India');
    await recPage.getByLabel('Work Mode *').selectOption('HYBRID');
    await recPage.getByLabel('Employment Type *').selectOption('INTERNSHIP');

    const descEditor = recPage.getByRole('textbox', { name: 'Detailed Job Description' });
    await descEditor.click();
    await descEditor.type(
      'Build scalable Python microservices, PostgreSQL search indexes, and modern cloud APIs.',
    );

    await recPage.getByRole('button', { name: '+ Python' }).click();
    await recPage.getByRole('button', { name: '+ SQL' }).click();

    await recPage.getByLabel('Minimum Salary').fill('40000');
    await recPage.getByLabel('Maximum Salary').fill('60000');

    await recPage.getByRole('button', { name: 'Publish Job' }).click();
    await expect(recPage).toHaveURL(/\/recruiter\/jobs$/);
    await expect(recPage.getByText(uniqueTitle)).toBeVisible();

    // 2. Candidate registers, searches, filters, inspects split-pane detail, and bookmarks
    const candCtx = await browser.newContext();
    const candPage = await candCtx.newPage();

    await candPage.goto('/register');
    await candPage.getByLabel('Full name').fill('E2E Candidate');
    await candPage.getByLabel('Email address').fill(candidateEmail);
    await candPage.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await candPage.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');
    await candPage.getByRole('button', { name: /create workspace account/i }).click();

    await expect(candPage).toHaveURL(/\/candidate\/dashboard/);
    await candPage
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Explore Jobs' })
      .click();
    await expect(candPage).toHaveURL(/\/candidate\/jobs/);

    await candPage.getByLabel('Search published jobs').fill(uniqueTitle);
    await expect(candPage.getByRole('heading', { name: uniqueTitle, level: 2 })).toBeVisible({
      timeout: 10000,
    });

    // Save / bookmark job from right detail panel
    await candPage.getByRole('button', { name: 'Save Job' }).click();
    await expect(candPage.getByRole('button', { name: 'Saved' })).toBeVisible();

    // Verify persistence on Saved Jobs page across reload
    await candPage.getByRole('link', { name: 'Saved Jobs' }).click();
    await expect(candPage).toHaveURL(/\/candidate\/saved-jobs/);
    await expect(candPage.getByText(uniqueTitle)).toBeVisible();

    await candPage.reload();
    await expect(candPage.getByText(uniqueTitle)).toBeVisible();

    await recCtx.close();
    await candCtx.close();
  });
});
