import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@talentforge.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe!Admin123$';

test.describe('TalentForge ATS Phase 1 End-to-End Verification', () => {
  test('Candidate registers, persists across refresh, blocked from recruiter/admin, and logs out', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const uniqueEmail = `pw_candidate_${Date.now()}@test.local`;

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    await page.getByLabel('Full name').fill('Playwright Candidate');
    await page.getByLabel('Email address').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await page.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');

    await page.getByRole('button', { name: /create workspace account/i }).click();

    // Redirected to Candidate dashboard
    await expect(page).toHaveURL(/\/candidate\/dashboard/);
    await expect(page.getByText(/Welcome, Playwright Candidate/i)).toBeVisible();

    // Browser refresh preserves authenticated session
    await page.reload();
    await expect(page).toHaveURL(/\/candidate\/dashboard/);
    await expect(page.getByText(/Welcome, Playwright Candidate/i)).toBeVisible();

    // Direct URL navigation to Recruiter or Admin redirects back to Candidate dashboard
    await page.goto('/recruiter/dashboard');
    await expect(page).toHaveURL(/\/candidate\/dashboard/);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/candidate\/dashboard/);

    // Sidebar navigation works
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByText(/Session & Security Controls/i)).toBeVisible();

    // Logout works
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated direct navigation redirects to login
    await page.goto('/candidate/dashboard');
    await expect(page).toHaveURL(/\/login/);

    expect(consoleErrors.filter((e) => !e.includes('401'))).toEqual([]);
  });

  test('Recruiter registers, logs in, and is blocked from admin dashboard', async ({ page }) => {
    const uniqueEmail = `pw_recruiter_${Date.now()}@test.local`;

    await page.goto('/register');
    await page.getByRole('button', { name: /Recruiter/i }).click();
    await page.getByLabel('Full name').fill('Playwright Recruiter');
    await page.getByLabel('Email address').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill('StrongPass!123');
    await page.getByLabel('Confirm password', { exact: true }).fill('StrongPass!123');
    await page.getByRole('button', { name: /create workspace account/i }).click();

    await expect(page).toHaveURL(/\/recruiter\/dashboard/);
    await expect(page.getByText(/Welcome, Playwright Recruiter/i)).toBeVisible();

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/recruiter\/dashboard/);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Seeded Admin logs in, views real PostgreSQL stats, and passes mobile responsiveness check', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    await page.getByLabel('Email address').fill(ADMIN_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in to workspace/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByText(/Total Registered Users/i)).toBeVisible();
    await expect(page.getByText(/Connected/i)).toBeVisible();

    // Verify no horizontal overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Open mobile navigation drawer
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('button', { name: 'User Management' })).toBeVisible();
  });
});
