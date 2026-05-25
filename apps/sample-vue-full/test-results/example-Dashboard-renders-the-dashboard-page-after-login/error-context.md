# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.js >> Dashboard >> renders the dashboard page after login
- Location: tests/example.spec.js:35:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.secure-layout, .dashboard, main')
Expected: visible
Error: strict mode violation: locator('.secure-layout, .dashboard, main') resolved to 3 elements:
    1) <section data-v-8a9a12a3="" class="css-dev-only-do-not-override-1p3hq3p ant-layout ant-layout-has-sider secure-layout">…</section> aka locator('section').filter({ hasText: 'NnovexDashboardDemoTestsWeb' })
    2) <main data-v-8a9a12a3="" class="ant-layout-content main-content">…</main> aka getByRole('main')
    3) <div class="dashboard" data-v-605ad960="" data-v-8a9a12a3="">…</div> aka locator('div').filter({ hasText: 'Feedback11.28% +4.6% from' }).nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.secure-layout, .dashboard, main')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
            - generic [ref=e18] [cursor=pointer]: Visuals
            - generic [ref=e20] [cursor=pointer]: Data Entry
            - generic [ref=e22] [cursor=pointer]: Favv
            - generic [ref=e24] [cursor=pointer]: Demo View
            - menuitem "Fill No ID" [ref=e25] [cursor=pointer]:
              - generic [ref=e26]: Fill No ID
            - generic [ref=e28] [cursor=pointer]: Test
        - button "logout Logout" [ref=e30] [cursor=pointer]:
          - img "logout" [ref=e31]:
            - img [ref=e32]
          - generic [ref=e34]: Logout
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]:
          - button "menu-fold" [ref=e38] [cursor=pointer]:
            - img "menu-fold" [ref=e39]:
              - img [ref=e40]
          - navigation [ref=e42]:
            - list [ref=e43]:
              - listitem [ref=e44]:
                - link "Home" [ref=e46] [cursor=pointer]:
                  - /url: /dashboard
                - text: /
              - listitem [ref=e47]:
                - generic [ref=e48]: Dashboard
        - generic [ref=e49]:
          - button "search" [ref=e50] [cursor=pointer]:
            - img "search" [ref=e51]:
              - img [ref=e52]
          - generic [ref=e54]:
            - button "Messages" [ref=e55] [cursor=pointer]:
              - img "message" [ref=e56]:
                - img [ref=e57]
            - superscript [ref=e59]:
              - paragraph [ref=e61]: "2"
          - generic [ref=e62]:
            - button "Notifications" [ref=e63] [cursor=pointer]:
              - img "bell" [ref=e64]:
                - img [ref=e65]
            - superscript [ref=e67]:
              - paragraph [ref=e69]: "2"
          - separator [ref=e70]
          - generic [ref=e72] [cursor=pointer]: U
      - main [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e78]:
              - generic [ref=e79]:
                - generic [ref=e80]: Feedback
                - img "rise" [ref=e82]:
                  - img [ref=e83]
              - generic [ref=e86]:
                - img "arrow-up" [ref=e88]:
                  - img [ref=e89]
                - generic [ref=e91]:
                  - generic [ref=e92]: "11"
                  - text: ".28"
                - generic [ref=e93]: "%"
              - generic [ref=e95]:
                - img "arrow-up" [ref=e96]:
                  - img [ref=e97]
                - text: +4.6% from last month
            - generic [ref=e101]:
              - generic [ref=e102]:
                - generic [ref=e103]: Idle
                - img "thunderbolt" [ref=e105]:
                  - img [ref=e106]
              - generic [ref=e109]:
                - img "arrow-down" [ref=e111]:
                  - img [ref=e112]
                - generic [ref=e114]:
                  - generic [ref=e115]: "9"
                  - text: ".30"
                - generic [ref=e116]: "%"
              - generic [ref=e118]:
                - img "arrow-down" [ref=e119]:
                  - img [ref=e120]
                - text: "-1.2% from last month"
            - generic [ref=e124]:
              - generic [ref=e125]:
                - generic [ref=e126]: Active Users
                - img "user" [ref=e128]:
                  - img [ref=e129]
              - generic [ref=e134]: 112,893
              - generic [ref=e136]: +2,340 this week
            - generic [ref=e139]:
              - generic [ref=e140]:
                - generic [ref=e141]: Account Balance (CNY)
                - img "dollar" [ref=e143]:
                  - img [ref=e144]
              - generic [ref=e148]:
                - generic [ref=e149]: 112,893
                - text: ".00"
              - generic [ref=e151]: Updated just now
          - generic [ref=e152]:
            - generic [ref=e154]:
              - generic [ref=e156]:
                - generic [ref=e158]:
                  - generic [ref=e160]:
                    - img "team" [ref=e161]:
                      - img [ref=e162]
                    - generic [ref=e164]: Team Members
                    - superscript [ref=e166]:
                      - paragraph [ref=e168]: "4"
                  - button "View all" [ref=e170] [cursor=pointer]:
                    - generic [ref=e171]: View all
                - generic [ref=e176]:
                  - generic [ref=e182] [cursor=pointer]:
                    - generic [ref=e184]: FT
                    - generic [ref=e185]:
                      - generic [ref=e186]: Faith Tan
                      - generic [ref=e187]: Full-stack Dev
                  - generic [ref=e193] [cursor=pointer]:
                    - generic [ref=e195]: HL
                    - generic [ref=e196]:
                      - generic [ref=e197]: Hope Lee
                      - generic [ref=e198]: Data Scientist
                  - generic [ref=e204] [cursor=pointer]:
                    - generic [ref=e206]: CW
                    - generic [ref=e207]:
                      - generic [ref=e208]: Charity Wong
                      - generic [ref=e209]: Data Engineer
                  - generic [ref=e215] [cursor=pointer]:
                    - generic [ref=e217]: LC
                    - generic [ref=e218]:
                      - generic [ref=e219]: Love Chen
                      - generic [ref=e220]: Data Scientist
              - generic [ref=e222]:
                - generic [ref=e224]:
                  - generic [ref=e226]:
                    - img "comment" [ref=e227]:
                      - img [ref=e228]
                    - generic [ref=e232]: Comments
                  - button "plus Add" [ref=e234] [cursor=pointer]:
                    - img "plus" [ref=e235]:
                      - img [ref=e236]
                    - generic [ref=e239]: Add
                - list [ref=e244]:
                  - listitem [ref=e245]:
                    - generic [ref=e246]:
                      - generic [ref=e249]: FT
                      - generic [ref=e250]:
                        - heading "Faith Tan Full-stack Dev 2 hours ago" [level=4] [ref=e251]:
                          - generic [ref=e252]:
                            - generic [ref=e253]: Faith Tan
                            - generic [ref=e254]: Full-stack Dev
                            - generic [ref=e255]: 2 hours ago
                        - generic [ref=e257]: The new dashboard layout looks great! Really improves the data visibility for the team. Can ...more
                    - list [ref=e258]:
                      - listitem [ref=e259]:
                        - button "like 5" [ref=e260] [cursor=pointer]:
                          - img "like" [ref=e261]:
                            - img [ref=e262]
                          - generic [ref=e264]: "5"
                        - emphasis [ref=e265]
                      - listitem [ref=e266]:
                        - button "message Reply" [ref=e267] [cursor=pointer]:
                          - img "message" [ref=e268]:
                            - img [ref=e269]
                          - generic [ref=e271]: Reply
                  - listitem [ref=e272]:
                    - generic [ref=e273]:
                      - generic [ref=e276]: HL
                      - generic [ref=e277]:
                        - heading "Hope Lee Data Scientist 1 hour ago" [level=4] [ref=e278]:
                          - generic [ref=e279]:
                            - generic [ref=e280]: Hope Lee
                            - generic [ref=e281]: Data Scientist
                            - generic [ref=e282]: 1 hour ago
                        - generic [ref=e284]: Agreed. The stat cards are much cleaner now. I think we should consider adding sparkline charts in...more
                    - list [ref=e285]:
                      - listitem [ref=e286]:
                        - button "like 3" [ref=e287] [cursor=pointer]:
                          - img "like" [ref=e288]:
                            - img [ref=e289]
                          - generic [ref=e291]: "3"
                        - emphasis [ref=e292]
                      - listitem [ref=e293]:
                        - button "message Reply" [ref=e294] [cursor=pointer]:
                          - img "message" [ref=e295]:
                            - img [ref=e296]
                          - generic [ref=e298]: Reply
                  - listitem [ref=e299]:
                    - generic [ref=e300]:
                      - generic [ref=e303]: CW
                      - generic [ref=e304]:
                        - heading "Charity Wong Data Engineer 30 min ago" [level=4] [ref=e305]:
                          - generic [ref=e306]:
                            - generic [ref=e307]: Charity Wong
                            - generic [ref=e308]: Data Engineer
                            - generic [ref=e309]: 30 min ago
                        - generic [ref=e311]: Pipeline ran successfully overnight. All 14 jobs completed without errors. Data is fresh as of 0...more
                    - list [ref=e312]:
                      - listitem [ref=e313]:
                        - button "like 7" [ref=e314] [cursor=pointer]:
                          - img "like" [ref=e315]:
                            - img [ref=e316]
                          - generic [ref=e318]: "7"
                        - emphasis [ref=e319]
                      - listitem [ref=e320]:
                        - button "message Reply" [ref=e321] [cursor=pointer]:
                          - img "message" [ref=e322]:
                            - img [ref=e323]
                          - generic [ref=e325]: Reply
            - generic [ref=e327]:
              - generic [ref=e329]:
                - generic [ref=e333]:
                  - img "link" [ref=e334]:
                    - img [ref=e335]
                  - generic [ref=e337]: Useful Links
                - list [ref=e342]:
                  - listitem [ref=e343] [cursor=pointer]:
                    - img "book" [ref=e345]:
                      - img [ref=e346]
                    - generic [ref=e348]:
                      - link "Documentation" [ref=e349]:
                        - /url: "#"
                      - generic [ref=e350]: Project docs and API reference
                    - img "link" [ref=e351]:
                      - img [ref=e352]
                  - listitem [ref=e354] [cursor=pointer]:
                    - img "github" [ref=e356]:
                      - img [ref=e357]
                    - generic [ref=e359]:
                      - link "GitHub Repo" [ref=e360]:
                        - /url: "#"
                      - generic [ref=e361]: Source code and pull requests
                    - img "link" [ref=e362]:
                      - img [ref=e363]
                  - listitem [ref=e365] [cursor=pointer]:
                    - img "code" [ref=e367]:
                      - img [ref=e368]
                    - generic [ref=e370]:
                      - link "API Playground" [ref=e371]:
                        - /url: "#"
                      - generic [ref=e372]: Test endpoints interactively
                    - img "link" [ref=e373]:
                      - img [ref=e374]
                  - listitem [ref=e376] [cursor=pointer]:
                    - img "file-text" [ref=e378]:
                      - img [ref=e379]
                    - generic [ref=e381]:
                      - link "Release Notes" [ref=e382]:
                        - /url: "#"
                      - generic [ref=e383]: Changelog and version history
                    - img "link" [ref=e384]:
                      - img [ref=e385]
                  - listitem [ref=e387] [cursor=pointer]:
                    - img "bug" [ref=e389]:
                      - img [ref=e390]
                    - generic [ref=e393]:
                      - link "Bug Tracker" [ref=e394]:
                        - /url: "#"
                      - generic [ref=e395]: Report and track issues
                    - img "link" [ref=e396]:
                      - img [ref=e397]
              - generic [ref=e400]:
                - generic [ref=e404]:
                  - img "notification" [ref=e405]:
                    - img [ref=e406]
                  - generic [ref=e408]: Announcements
                  - superscript [ref=e410]:
                    - paragraph [ref=e412]: "2"
                - list [ref=e414]:
                  - listitem [ref=e415]:
                    - generic [ref=e419]:
                      - generic [ref=e420]:
                        - generic [ref=e421]: Release
                        - generic [ref=e422]: 2 hours ago
                      - paragraph [ref=e423]: v0.7.0 released
                      - paragraph [ref=e424]: New sidebar layout, reusable StatCard and MemberCard components, and ADV-based header with notifications and chat.
                  - listitem [ref=e425]:
                    - generic [ref=e429]:
                      - generic [ref=e430]:
                        - generic [ref=e431]: Maintenance
                        - generic [ref=e432]: Yesterday
                      - paragraph [ref=e433]: Scheduled downtime — 22 May 02:00 UTC
                      - paragraph [ref=e434]: "Database migration for the audit log table. Expected duration: 15 minutes. No data loss expected."
                  - listitem [ref=e435]:
                    - generic [ref=e439]:
                      - generic [ref=e440]:
                        - generic [ref=e441]: Update
                        - generic [ref=e442]: 3 days ago
                      - paragraph [ref=e443]: CDN dependencies updated
                      - paragraph [ref=e444]: Vue upgraded to 3.5.34, vue-router to 4.6.4, Bulma to 0.9.4. SRI hashes refreshed across all CDN links.
                  - listitem [ref=e445]:
                    - generic [ref=e448]:
                      - generic [ref=e449]:
                        - generic [ref=e450]: Security
                        - generic [ref=e451]: 1 week ago
                      - paragraph [ref=e452]: SRI enforcement enabled
                      - paragraph [ref=e453]: All external CDN resources now require Subresource Integrity attributes. Review your custom scripts if any.
      - generic [ref=e454]:
        - generic [ref=e455]: novex
        - generic [ref=e456]: ·
        - generic [ref=e457]: 2026 All rights reserved
  - generic [ref=e458]:
    - generic [ref=e459]: Pipeline ran successfully overnight. All 14 jobs completed without errors. Data is fresh as of 0...
    - text: more
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
> 37 |     await expect(page.locator('.secure-layout, .dashboard, main')).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
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
  53 |     await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
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