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

test('splash stage renders with resume link and WASM layer', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('#shell')).toBeVisible();
  await expect(page.locator('#splash')).toBeVisible();
  await expect(page.locator('.stage-name')).toBeVisible();
  await expect(page.locator('[data-systems-field-canvas]')).toBeAttached();
  await expect(page.locator('button[data-open-split="resume"]')).toBeVisible();
});

test('desktop systems field initializes as a progressive enhancement', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
});

test('opening resume split shows PDF pane chrome', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-site-mode', 'resume');
  await expect(page.locator('#pane-detail')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#chrome-label')).toHaveText('resume.pdf');
});

test('systems field remains mounted when split opens', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator('[data-systems-field-canvas]')).toBeAttached();
});

test('/workspace redirect lands on /', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto(`${BASE}/workspace`);
  expect(page.url()).toMatch(/\/$/);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('404 returns not-found page', async ({ page }) => {
  const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: 'commit' });
  expect(res?.status()).toBe(404);
});

test('reduced-motion: splash renders a static field frame', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('#splash')).toBeVisible();
  // The field still initializes — it renders a single static frame.
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await ctx.close();
});

test('blocked systems field WASM keeps splash usable', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.route('**/wasm/canvas/**', (route) => route.abort());
  await page.goto(`${BASE}/`);
  await expect(page.locator('#splash')).toBeVisible();
  await expect(page.locator('button[data-open-split="resume"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('contact split opens from command button', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.locator('button[data-open-split="contact"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-site-mode', 'contact');
  await expect(page.locator('#contact-title')).toBeVisible();
});

test('contact pane keeps systems field ready', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/, {
    timeout: 8_000,
  });
  await page.locator('button[data-open-split="contact"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-site-mode', 'contact');
  const message = page.locator('#cf-message');
  if ((await message.count()) > 0) {
    await message.focus();
    await message.fill('hello');
  } else {
    await page.locator('#contact-title').click();
  }
  await expect(page.locator('[data-systems-field-layer]')).toHaveClass(/is-systems-field-ready/);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('figure caption is present with source link', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('.field-caption')).toBeAttached();
  await expect(page.locator('.field-caption a[href*="github.com"]')).toBeAttached();
});

test('project rows render and open the project pane', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const row = page.locator('button[data-open-project]').first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('html')).toHaveAttribute('data-site-mode', 'project');
  await expect(page.locator('#view-project')).toBeVisible();
  await expect(page.locator('[data-project-detail]:not([hidden])')).toBeVisible();
});

test('/resume renders semantic HTML resume', async ({ page }) => {
  await page.goto(`${BASE}/resume`);
  await expect(page.locator('.resume-document')).toBeVisible();
  await expect(page.locator('a[href="/resume.pdf"]')).toBeVisible();
});

test('theme toggle is present in the stage glyphs', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('.stage-glyphs .theme-toggle')).toBeVisible();
});

test('mobile viewport (375px wide) shows splash without overflow', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator('#splash')).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
  await ctx.close();
});
