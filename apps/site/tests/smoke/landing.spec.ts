import { expect, test } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';
if (BASE.includes('<') || BASE.includes('>')) {
  throw new Error(
    `SMOKE_BASE_URL looks like a placeholder: ${BASE}\nUse the *actual* preview URL from the deploy output, e.g. https://<hash>-yanai-sh-staging.yanaiklugman.workers.dev`,
  );
}

test('first viewport shows home hero and resume CTA', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('section#home')).toBeVisible();
  await expect(page.locator('[data-systems-field-canvas]')).toBeAttached();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
});

test('desktop systems field initializes as a progressive enhancement', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-hero]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
});

test('/workspace redirect lands on /#home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
  });
  await page.goto(`${BASE}/workspace`);
  expect(page.url()).toMatch(/\/#home$/);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('404 returns Astro 404 page', async ({ page }) => {
  const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'commit' });
  expect(res?.status()).toBe(404);
});

test('reduced-motion: home section still renders', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('section#home')).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator('[data-systems-hero]')).not.toHaveClass(/is-systems-field-ready/);
  await ctx.close();
});

test('blocked systems field WASM keeps hero usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
  });
  await page.route('**/wasm/canvas/**', (route) => route.abort());
  await page.goto(`${BASE}/`);
  await expect(page.locator('section#home')).toBeVisible();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('contact section renders direct email', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.locator('#contact a[href^="mailto:"]').first()).toBeVisible();
});

test('mobile viewport (375px wide) shows resume CTA without overflow', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('section#home')).toBeVisible();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeAttached();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
  await ctx.close();
});
