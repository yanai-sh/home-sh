// apps/site/tests/smoke/workspace.spec.ts — systems strip now lives on `/` inside `#systems`.
import { expect, test } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';
if (BASE.includes('<') || BASE.includes('>')) {
  throw new Error(
    `SMOKE_BASE_URL looks like a placeholder: ${BASE}\nUse the *actual* preview URL from the deploy output, e.g. https://<hash>-yanai-sh-staging.yanaiklugman.workers.dev`,
  );
}

/** Home mounts systems WASM/search on idle (≤3.5s); allow time before asserting runtime strip. */
// biome-ignore lint/suspicious/noExplicitAny: Playwright Page is only a devDependency at repo root; keep smoke self-contained for astro check.
async function gotoHomeSystemsReady(page: any) {
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(5200);
}

test('deep link /#stack opens stack pane in viewport', async ({ page }) => {
  await page.goto(`${BASE}/#stack`);
  await page.waitForTimeout(5200);
  const heading = page.locator('#stack-title');
  await expect(heading).toBeInViewport();
});

test('deep link /#stack focuses the stack heading', async ({ page }) => {
  await page.goto(`${BASE}/#stack`);
  await page.waitForTimeout(5200);
  await expect(async () => {
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId).toBe('stack-title');
  }).toPass({ timeout: 8000 });
});

test('clicking a pane-nav link activates the uses pane', async ({ page }) => {
  await gotoHomeSystemsReady(page);
  await page.locator('#systems a[data-pane-link="uses"]').click();
  await expect(page.locator('#systems a[data-pane-link="uses"]')).toHaveAttribute('aria-current', 'true', {
    timeout: 8000,
  });
  await expect(page.locator('#systems #uses-title')).toBeInViewport();
});

test('aria-current updates to the active pane on scroll', async ({ page }) => {
  await gotoHomeSystemsReady(page);
  await page.locator('#stack[data-pane]').scrollIntoViewIfNeeded();
  await expect(page.locator('a[data-pane-link="stack"]')).toHaveAttribute('aria-current', 'true', {
    timeout: 8000,
  });
});

test('runtime strip transitions wasm/sab/canvas out of pending', async ({ page }) => {
  await gotoHomeSystemsReady(page);
  for (const item of ['wasm', 'sab', 'canvas']) {
    const status = page.locator(`[data-wip-status="${item}"]`);
    await expect(status).not.toHaveText(/pending/i, { timeout: 12000 });
  }
});

test('search panel opens and closes without error', async ({ page }) => {
  await gotoHomeSystemsReady(page);
  await expect(page.locator('#home-search-panel')).toBeHidden();
  await page.click('#home-search-trigger');
  await expect(page.locator('#home-search-panel')).toBeVisible();
  await page.click('#home-search-close');
  await expect(page.locator('#home-search-panel')).toBeHidden();
});

test('reduced-motion: canvas frame is hidden, prose fills the projects pane', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#projects`);
  const canvas = page.locator('#home-rust-canvas');
  await expect(canvas).toBeHidden();
  await expect(page.locator('#sys-projects-title')).toBeInViewport();
  await ctx.close();
});

test('WASM load failure: pane content remains readable, fallback visible', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route('**/wasm/canvas/**', (route) => route.abort());
  await page.goto(`${BASE}/#projects`);
  await page.waitForTimeout(5200);
  await expect(page.locator('#sys-projects-title')).toBeInViewport();
  await expect(page.locator('#systems .canvas-frame p')).toContainText(/Rust lyon/i);
  await expect(page.locator('[data-wip-status="canvas"]')).toHaveAttribute('data-state', 'error', {
    timeout: 12000,
  });
  await ctx.close();
});

test('GET /workspace redirects toward /#systems', async ({ request }) => {
  const res = await request.get(`${BASE}/workspace`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  const loc = res.headers().location ?? '';
  expect(loc).toMatch(/\/#systems$/);
});

test('COOP/COEP headers absent on /', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'header check is informational for deployed Worker');
  const root = await request.get(`${BASE}/`);
  expect(root.headers()['cross-origin-embedder-policy']).toBeUndefined();
  expect(root.headers()['cross-origin-opener-policy']).toBeUndefined();
});

test('mobile viewport (375px) renders pane-nav as horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await gotoHomeSystemsReady(page);
  const navBox = await page.locator('.pane-nav').boundingBox();
  expect(navBox).not.toBeNull();
  if (navBox) {
    expect(navBox.width).toBeGreaterThan(navBox.height);
  }
  await ctx.close();
});

test('telemetry pane renders aggregate stat slots', async ({ page }) => {
  await page.goto(`${BASE}/#telemetry`);
  await page.waitForTimeout(5200);
  const first = page.locator('#systems [data-telemetry-stat="total-sessions"]');
  if ((await first.count()) === 0) {
    test.skip(
      Boolean(process.env.SMOKE_BASE_URL),
      'target origin does not expose telemetry UI yet (deploy this branch to staging and set SMOKE_BASE_URL there)',
    );
  }
  for (const name of ['total-sessions', 'sessions-30d', 'avg-lcp', 'avg-fps', 'countries', 'devices']) {
    await expect(page.locator(`#systems [data-telemetry-stat="${name}"]`)).toBeAttached();
  }
});

test('beacon endpoint rejects malformed UUID', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'beacon endpoint requires deployed Worker (D1 binding)');
  const res = await request.post(`${BASE}/api/telemetry/beacon`, {
    data: { id: 'not-a-uuid', started_at: Date.now() },
  });
  if (res.status() === 404) {
    test.skip(
      true,
      'target origin does not expose /api/telemetry/* yet (deploy this branch to staging and set SMOKE_BASE_URL there)',
    );
  }
  expect(res.status()).toBe(400);
});

test('beacon endpoint accepts oversized frame_samples without erroring', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'beacon endpoint requires deployed Worker (D1 binding)');
  const samples = Array.from({ length: 1000 }, (_, i) => ({ t: i, fps: 60 }));
  const res = await request.post(`${BASE}/api/telemetry/beacon`, {
    data: {
      id: '44444444-4444-4444-8444-444444444444',
      started_at: Date.now(),
      frame_samples: samples,
    },
  });
  if (res.status() === 404) {
    test.skip(
      true,
      'target origin does not expose /api/telemetry/* yet (deploy this branch to staging and set SMOKE_BASE_URL there)',
    );
  }
  expect(res.status()).toBe(200);
});

test('stats endpoint returns expected aggregate shape', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'stats endpoint requires deployed Worker (D1 binding)');
  const res = await request.get(`${BASE}/api/telemetry/stats`);
  if (res.status() === 404) {
    test.skip(
      true,
      'target origin does not expose /api/telemetry/* yet (deploy this branch to staging and set SMOKE_BASE_URL there)',
    );
  }
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('max-age=60');
  const body = await res.json();
  for (const key of [
    'total_sessions',
    'sessions_last_30d',
    'avg_lcp_ms',
    'avg_fps',
    'top_countries',
    'device_breakdown',
  ]) {
    expect(body).toHaveProperty(key);
  }
  expect(JSON.stringify(body)).not.toMatch(/\bid\b/);
});

test('DNT user does not POST a beacon', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'doNotTrack', {
      configurable: true,
      get: () => '1',
    });
  });
  let beaconRequests = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/telemetry/beacon')) beaconRequests += 1;
  });
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(6000);
  expect(beaconRequests).toBe(0);
  await ctx.close();
});
