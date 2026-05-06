import { expect, test } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';

test('first viewport shows resume CTAs', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('a[href="/resume"]').first()).toBeVisible();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
});

test('resume route renders content', async ({ page }) => {
  await page.goto(`${BASE}/resume`);
  await expect(page.locator('h1')).toBeVisible();
  // `.entry` is the per-job article inside `.timeline` on /resume.
  await expect(page.locator('.entry').first()).toBeVisible();
});

test('resume.pdf returns a PDF', async ({ request }) => {
  const res = await request.get(`${BASE}/resume.pdf`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');
});

test('workspace renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/workspace`);
  expect(errors).toEqual([]);
});

test('404 returns Astro 404 page', async ({ page }) => {
  const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'commit' });
  expect(res?.status()).toBe(404);
});

test('reduced-motion: page still renders content', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  // Page must still render content even with reduced-motion (no JS-required content).
  await expect(page.locator('a[href="/resume"]').first()).toBeVisible();
  await ctx.close();
});

test('contact form renders sitekey', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const form = page.locator('#contact-form');
  await expect(form).toBeVisible();
  const sitekey = await form.getAttribute('data-sitekey');
  expect(sitekey).toMatch(/^0x4AAAA/);
});

test('mobile viewport (375px wide) shows resume CTAs without overflow', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('a[href="/resume"]').first()).toBeVisible();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
  // No horizontal scroll on mobile.
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
  await ctx.close();
});
