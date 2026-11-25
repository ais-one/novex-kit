const { test, expect } = require('@playwright/test');

// https://github.com/calm1205/vite-playwright-msw/blob/main/src/__tests__/index.spec.ts

const BASE_URL = 'http://127.0.0.1:8080/';
test.describe('New Todo', () => {
  test.beforeEach(async ({ page }) => await page.goto(BASE_URL));

  test('basic test', async ({ page }) => {
    page.on('console', msg => {
      console.log(msg);
    });
    await page.waitForTimeout(2000);

    // await page.goto('http://127.0.0.1:8080/')

    // await page.locator('text=Login').click()
    await page.locator('[data-cy="login"]').click();
    // await page.waitForURL('**/') // need timeout
    await expect(page.url()).toEqual(BASE_URL);

    const xx = await page.locator('[data-cy="otp"]').click();
    console.log('>>>>', xx);
    // .click()

    // await page.locator('text=Login').click()
    // await expect(page.url()).toEqual(BASE_URL)

    await page.waitForURL('**/dashboard'); // need timeout
    await expect(page.url()).toEqual(`${BASE_URL}dashboard`);

    // console.log(page.url())
    // await page.waitForTimeout(2000)
    // await page.waitForNavigation()
    // Get page after a specific action (e.g. clicking a link)
    // await page.goto('https://playwright.dev/')
    // const title = page.locator('.navbar__inner .navbar__title')
    // await expect(title).toHaveText('Playwright')
  });
});
