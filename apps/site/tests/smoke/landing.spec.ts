import { expect, test, type Page } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';
if (BASE.includes('<') || BASE.includes('>')) {
  throw new Error(
    `SMOKE_BASE_URL looks like a placeholder: ${BASE}\nUse the *actual* preview URL from the deploy output, e.g. https://<hash>-yanai-sh-staging.yanaiklugman.workers.dev`,
  );
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    if (!error.message.includes('[Cloudflare Turnstile]')) errors.push(error.message);
  });
  return errors;
}

test('first viewport shows home hero and resume CTA', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('section#home')).toBeVisible();
  await expect(page.locator('[data-systems-field-canvas]')).toBeAttached();
  await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
});

test('desktop systems field initializes as a progressive enhancement', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await expect(page.locator('.systems-field-debug')).toHaveCount(0);
});

test('light theme renders a bright systems field', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    localStorage.setItem('yanai-sh:theme', 'light');
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  const luminance = await page.evaluate(() => {
    const canvas = document.querySelector('[data-systems-field-canvas]');
    if (!(canvas instanceof HTMLCanvasElement)) return 0;
    const context = canvas.getContext('2d');
    const sample = context?.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      12,
      12,
    ).data;
    if (!sample) return 0;
    let total = 0;
    for (let index = 0; index < sample.length; index += 4) {
      total += (sample[index] + sample[index + 1] + sample[index + 2]) / 3;
    }
    return total / (sample.length / 4);
  });
  expect(luminance).toBeGreaterThan(120);
  await ctx.close();
});

test('systems field debug overlay is opt-in', async ({ page }) => {
  await page.goto(`${BASE}/?wasmDebug=1`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await expect(page.locator('.systems-field-debug')).toBeVisible();
  await expect(page.locator('.systems-field-debug')).toContainText('nodes');
});

test('systems field remains mounted beyond the hero', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-systems-field-canvas]')).toBeAttached();
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/);
});

test('/workspace redirect lands on /#home', async ({ page }) => {
  const errors = collectPageErrors(page);
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
  await expect(page.locator('[data-systems-field-layer]')).not.toHaveClass(/is-systems-field-ready/);
  await ctx.close();
});

test('blocked systems field WASM keeps hero usable', async ({ page }) => {
  const errors = collectPageErrors(page);
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
