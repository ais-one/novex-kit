import { expect, test } from '@playwright/test';

// Shared login helper — reused across test suites
async function loginWithMsw(page) {
  await page.goto('/');
  await page.getByTestId('username').fill('test@example.com');
  await page.getByTestId('password').fill('password123');
  await page.getByTestId('login').click();
  await page.getByTestId('pin').fill('111111');
  await page.getByTestId('otp').click();
  await page.waitForURL('**/dashboard');
}

test.describe('Sign-in flow', () => {
  test('completes login and OTP and lands on dashboard', async ({ page }) => {
    await loginWithMsw(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('shows OTP screen after submitting login credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('username').fill('test@example.com');
    await page.getByTestId('password').fill('password123');
    await page.getByTestId('login').click();
    await expect(page.getByTestId('pin')).toBeVisible();
    await expect(page.getByTestId('otp')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMsw(page);
  });

  test('renders the dashboard page after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('.secure-layout, .dashboard, main')).toBeVisible();
  });

  test('sidebar is visible with navigation links', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider, aside')).toBeVisible();
  });
});

test.describe('T4t Student table', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMsw(page);
    await page.goto('/t4t/student');
    await page.waitForLoadState('networkidle');
  });

  test('loads the student table with mock data', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Carol' })).toBeVisible();
  });

  test('opens the filter drawer when Filter button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /filter/i }).click();
    await expect(page.getByText('Add Filter')).toBeVisible();
    await expect(page.getByText('Apply')).toBeVisible();
  });

  test('opens the create drawer when Create button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText('Create Record')).toBeVisible();
  });
});
