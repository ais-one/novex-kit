# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.js >> T4t Student table >> loads the student table with mock data
- Location: tests/example.spec.js:52:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('cell', { name: 'Alice' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('cell', { name: 'Alice' })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]: "N"
      - generic [ref=e9]: novex
    - generic [ref=e10]:
      - paragraph [ref=e11]: Full-stack monorepo template
      - heading [level=2] [ref=e12]:
        - text: Build faster.
        - emphasis [ref=e13]: Ship smarter.
      - list [ref=e14]:
        - listitem [ref=e15]: Node 24
        - listitem [ref=e16]: Vue 3
        - listitem [ref=e17]: Express
        - listitem [ref=e18]: ES Modules
    - blockquote [ref=e19]: "\"The monorepo foundation we always wanted but never had time to build.\""
  - main [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - heading "Welcome back" [level=1] [ref=e24]
          - paragraph [ref=e25]: Sign in to continue to your workspace
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]: Email address
            - textbox "Email address" [ref=e29]:
              - /placeholder: you@company.com
              - text: test
          - generic [ref=e30]:
            - generic [ref=e31]: Password
            - textbox "Password" [ref=e32]:
              - /placeholder: Enter your password
              - text: test
          - generic [ref=e33] [cursor=pointer]:
            - checkbox "Force login (bypass backend)" [ref=e35]
            - generic [ref=e37]: Force login (bypass backend)
        - generic [ref=e38]:
          - button "Sign In" [ref=e39] [cursor=pointer]:
            - generic [ref=e40]: Sign In
            - img [ref=e41]
          - generic [ref=e44]: or
          - button "Continue with OAuth" [ref=e45] [cursor=pointer]:
            - img [ref=e46]
            - generic [ref=e48]: Continue with OAuth
        - paragraph [ref=e49]:
          - text: No account yet?
          - link "Create one" [ref=e50] [cursor=pointer]:
            - /url: /signup
      - paragraph [ref=e51]: Desktop view
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | // Shared login helper — reused across test suites
  4  | async function loginWithMsw(page) {
  5  |   await page.goto('/');
  6  |   await page.getByTestId('username').fill('test@example.com');
  7  |   await page.getByTestId('password').fill('password123');
  8  |   await page.getByTestId('login').click();
  9  |   await page.getByTestId('pin').fill('111111');
  10 |   await page.getByTestId('otp').click();
  11 |   await page.waitForURL('**/dashboard');
  12 | }
  13 | 
  14 | test.describe('Sign-in flow', () => {
  15 |   test('completes login and OTP and lands on dashboard', async ({ page }) => {
  16 |     await loginWithMsw(page);
  17 |     await expect(page).toHaveURL(/dashboard/);
  18 |   });
  19 | 
  20 |   test('shows OTP screen after submitting login credentials', async ({ page }) => {
  21 |     await page.goto('/');
  22 |     await page.getByTestId('username').fill('test@example.com');
  23 |     await page.getByTestId('password').fill('password123');
  24 |     await page.getByTestId('login').click();
  25 |     await expect(page.getByTestId('pin')).toBeVisible();
  26 |     await expect(page.getByTestId('otp')).toBeVisible();
  27 |   });
  28 | });
  29 | 
  30 | test.describe('Dashboard', () => {
  31 |   test.beforeEach(async ({ page }) => {
  32 |     await loginWithMsw(page);
  33 |   });
  34 | 
  35 |   test('renders the dashboard page after login', async ({ page }) => {
  36 |     await expect(page).toHaveURL(/dashboard/);
  37 |     await expect(page.locator('.secure-layout, .dashboard, main')).toBeVisible();
  38 |   });
  39 | 
  40 |   test('sidebar is visible with navigation links', async ({ page }) => {
  41 |     await expect(page.locator('.ant-layout-sider, aside')).toBeVisible();
  42 |   });
  43 | });
  44 | 
  45 | test.describe('T4t Student table', () => {
  46 |   test.beforeEach(async ({ page }) => {
  47 |     await loginWithMsw(page);
  48 |     await page.goto('/t4t/student');
  49 |     await page.waitForLoadState('networkidle');
  50 |   });
  51 | 
  52 |   test('loads the student table with mock data', async ({ page }) => {
> 53 |     await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  54 |     await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();
  55 |     await expect(page.getByRole('cell', { name: 'Carol' })).toBeVisible();
  56 |   });
  57 | 
  58 |   test('opens the filter drawer when Filter button is clicked', async ({ page }) => {
  59 |     await page.getByRole('button', { name: /filter/i }).click();
  60 |     await expect(page.getByText('Add Filter')).toBeVisible();
  61 |     await expect(page.getByText('Apply')).toBeVisible();
  62 |   });
  63 | 
  64 |   test('opens the create drawer when Create button is clicked', async ({ page }) => {
  65 |     await page.getByRole('button', { name: /create/i }).click();
  66 |     await expect(page.getByText('Create Record')).toBeVisible();
  67 |   });
  68 | });
  69 | 
```