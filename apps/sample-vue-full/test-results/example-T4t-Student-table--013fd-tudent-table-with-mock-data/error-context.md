# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.js >> T4t Student table >> loads the student table with mock data
- Location: tests/example.spec.js:61:3

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
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6] [cursor=pointer]:
          - generic [ref=e7]: "N"
          - generic [ref=e8]: novex
        - navigation [ref=e9]:
          - menu [ref=e10]:
            - menuitem "Dashboard" [ref=e11] [cursor=pointer]:
              - generic [ref=e12]: Dashboard
            - generic [ref=e14] [cursor=pointer]: Demo
            - generic [ref=e16] [cursor=pointer]: T4t
            - list [ref=e17]:
              - menuitem "T4t - Student" [ref=e18] [cursor=pointer]:
                - generic [ref=e19]: T4t - Student
              - menuitem "T4t - Subject" [ref=e20] [cursor=pointer]:
                - generic [ref=e21]: T4t - Subject
              - menuitem "T4t - Audit Logs" [ref=e22] [cursor=pointer]:
                - generic [ref=e23]: T4t - Audit Logs
            - generic [ref=e25] [cursor=pointer]: Visuals
            - generic [ref=e27] [cursor=pointer]: Data Entry
            - generic [ref=e29] [cursor=pointer]: Favv
            - generic [ref=e31] [cursor=pointer]: Demo View
            - menuitem "Fill No ID" [ref=e32] [cursor=pointer]:
              - generic [ref=e33]: Fill No ID
            - generic [ref=e35] [cursor=pointer]: Test
        - button "logout Logout" [ref=e37] [cursor=pointer]:
          - img "logout" [ref=e38]:
            - img [ref=e39]
          - generic [ref=e41]: Logout
    - generic [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - button "menu-fold" [ref=e45] [cursor=pointer]:
            - img "menu-fold" [ref=e46]:
              - img [ref=e47]
          - navigation [ref=e49]:
            - list [ref=e50]:
              - listitem [ref=e51]:
                - link "Home" [ref=e53] [cursor=pointer]:
                  - /url: /dashboard
                - text: /
              - listitem [ref=e54]:
                - generic [ref=e55]: T4t - Student
        - generic [ref=e56]:
          - button "search" [ref=e57] [cursor=pointer]:
            - img "search" [ref=e58]:
              - img [ref=e59]
          - generic [ref=e61]:
            - button "Messages" [ref=e62] [cursor=pointer]:
              - img "message" [ref=e63]:
                - img [ref=e64]
            - superscript [ref=e66]:
              - paragraph [ref=e68]: "2"
          - generic [ref=e69]:
            - button "Notifications" [ref=e70] [cursor=pointer]:
              - img "bell" [ref=e71]:
                - img [ref=e72]
            - superscript [ref=e74]:
              - paragraph [ref=e76]: "2"
          - separator [ref=e77]
          - generic [ref=e79] [cursor=pointer]: U
      - main [ref=e80]:
        - generic [ref=e82]:
          - generic [ref=e84]:
            - generic [ref=e86]:
              - img "table" [ref=e87]:
                - img [ref=e88]
              - generic [ref=e90]: Students
            - generic [ref=e92]:
              - button "reload Reload" [active] [ref=e94] [cursor=pointer]:
                - img "reload" [ref=e95]:
                  - img [ref=e96]
                - generic [ref=e98]: Reload
              - button "filter Filter" [ref=e100] [cursor=pointer]:
                - img "filter" [ref=e101]:
                  - img [ref=e102]
                - generic [ref=e104]: Filter
              - button "plus Create" [ref=e106] [cursor=pointer]:
                - img "plus" [ref=e107]:
                  - img [ref=e108]
                - generic [ref=e111]: Create
              - button "delete Delete" [ref=e113] [cursor=pointer]:
                - img "delete" [ref=e114]:
                  - img [ref=e115]
                - generic [ref=e117]: Delete
              - button "upload Import" [ref=e121]:
                - button "upload Import" [ref=e122] [cursor=pointer]:
                  - img "upload" [ref=e123]:
                    - img [ref=e124]
                  - generic [ref=e126]: Import
              - button "download Export" [ref=e128] [cursor=pointer]:
                - img "download" [ref=e129]:
                  - img [ref=e130]
                - generic [ref=e132]: Export
          - generic [ref=e138]:
            - table [ref=e140]:
              - rowgroup [ref=e153]:
                - row "Select all ID First Name caret-up caret-down Last Name Sex Age GPA Date of Birth Remarks Updated At" [ref=e154]:
                  - columnheader "Select all" [ref=e155]:
                    - generic [ref=e157]:
                      - generic:
                        - checkbox "Select all" [disabled]
                  - columnheader "ID" [ref=e158]: ID
                  - columnheader "First Name caret-up caret-down" [ref=e161] [cursor=pointer]:
                    - generic [ref=e162]:
                      - generic [ref=e163]: First Name
                      - generic [ref=e165]:
                        - generic "caret-up" [ref=e166]:
                          - img [ref=e167]
                        - generic "caret-down" [ref=e169]:
                          - img [ref=e170]
                  - columnheader "Last Name" [ref=e174]: Last Name
                  - columnheader "Sex" [ref=e177]: Sex
                  - columnheader "Age" [ref=e180]: Age
                  - columnheader "GPA" [ref=e183]: GPA
                  - columnheader "Date of Birth" [ref=e186]: Date of Birth
                  - columnheader "Remarks" [ref=e189]: Remarks
                  - columnheader "Updated At" [ref=e192]: Updated At
                  - columnheader [ref=e195]
            - table [ref=e197]:
              - rowgroup [ref=e209]:
                - row "No data" [ref=e210]:
                  - cell "No data" [ref=e211] [cursor=pointer]:
                    - generic [ref=e213]:
                      - img [ref=e215]
                      - paragraph [ref=e221]: No data
      - generic [ref=e222]:
        - generic [ref=e223]: novex
        - generic [ref=e224]: ·
        - generic [ref=e225]: 2026 All rights reserved
  - generic [ref=e226]:
    - generic [ref=e227]: Pipeline ran successfully overnight. All 14 jobs completed without errors. Data is fresh as of 0...
    - text: more
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | async function loginWithMsw(page) {
  4  |   await page.goto('/');
  5  |   await page.getByTestId('username').fill('test@example.com');
  6  |   await page.getByTestId('password').fill('password123');
  7  |   await page.getByTestId('login').click();
  8  |   await page.getByTestId('pin').fill('111111');
  9  |   await page.getByTestId('otp').click();
  10 |   await page.waitForURL('**/dashboard');
  11 | }
  12 | 
  13 | // Navigate within the SPA (no full page reload) so the auth state is preserved.
  14 | async function navigateToStudent(page) {
  15 |   await page.locator('.ant-menu-submenu-title', { hasText: 'T4t' }).click();
  16 |   await page.getByText('T4t - Student').click();
  17 |   await page.waitForURL('**/t4t/student');
  18 |   await page.waitForLoadState('networkidle');
  19 |   // Click Reload to ensure fetchData fires even if initial onMounted load missed it.
  20 |   await page.getByRole('button', { name: /reload/i }).click();
  21 |   await page.waitForLoadState('networkidle');
  22 | }
  23 | 
  24 | test.describe('Sign-in flow', () => {
  25 |   test('completes login and OTP and lands on dashboard', async ({ page }) => {
  26 |     await loginWithMsw(page);
  27 |     await expect(page).toHaveURL(/dashboard/);
  28 |   });
  29 | 
  30 |   test('shows OTP screen after submitting login credentials', async ({ page }) => {
  31 |     await page.goto('/');
  32 |     await page.getByTestId('username').fill('test@example.com');
  33 |     await page.getByTestId('password').fill('password123');
  34 |     await page.getByTestId('login').click();
  35 |     await expect(page.getByTestId('pin')).toBeVisible();
  36 |     await expect(page.getByTestId('otp')).toBeVisible();
  37 |   });
  38 | });
  39 | 
  40 | test.describe('Dashboard', () => {
  41 |   test.beforeEach(async ({ page }) => {
  42 |     await loginWithMsw(page);
  43 |   });
  44 | 
  45 |   test('renders the dashboard page after login', async ({ page }) => {
  46 |     await expect(page).toHaveURL(/dashboard/);
  47 |     await expect(page.locator('.secure-layout')).toBeVisible();
  48 |   });
  49 | 
  50 |   test('sidebar is visible with navigation links', async ({ page }) => {
  51 |     await expect(page.locator('.ant-layout-sider, aside')).toBeVisible();
  52 |   });
  53 | });
  54 | 
  55 | test.describe('T4t Student table', () => {
  56 |   test.beforeEach(async ({ page }) => {
  57 |     await loginWithMsw(page);
  58 |     await navigateToStudent(page);
  59 |   });
  60 | 
  61 |   test('loads the student table with mock data', async ({ page }) => {
> 62 |     await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  63 |     await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();
  64 |     await expect(page.getByRole('cell', { name: 'Carol' })).toBeVisible();
  65 |   });
  66 | 
  67 |   test('opens the filter drawer when Filter button is clicked', async ({ page }) => {
  68 |     await page.getByRole('button', { name: /filter/i }).click();
  69 |     await expect(page.getByText('Add Filter')).toBeVisible();
  70 |     await expect(page.getByText('Apply')).toBeVisible();
  71 |   });
  72 | 
  73 |   test('opens the create drawer when Create button is clicked', async ({ page }) => {
  74 |     await page.getByRole('button', { name: /create/i }).click();
  75 |     await expect(page.getByText('Create Record')).toBeVisible();
  76 |   });
  77 | });
  78 | 
```