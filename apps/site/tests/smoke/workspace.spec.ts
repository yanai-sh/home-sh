// apps/site/tests/smoke/workspace.spec.ts
import { expect, test } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';
if (BASE.includes('<') || BASE.includes('>')) {
  throw new Error(
    `SMOKE_BASE_URL looks like a placeholder: ${BASE}\nUse the *actual* preview URL from the deploy output, e.g. https://<hash>-yanai-sh-staging.yanaiklugman.workers.dev`,
  );
}

test('deep link /workspace#stack opens stack pane in viewport', async ({ page }) => {
  await page.goto(`${BASE}/workspace#stack`);
  // Browser fragment-nav scrolls #stack into view; we assert the heading is on screen.
  const heading = page.locator('#stack-title');
  await expect(heading).toBeInViewport();
});

test('deep link /workspace#stack focuses the stack heading', async ({ page }) => {
  await page.goto(`${BASE}/workspace#stack`);
  // Task 2 defers focus by one rAF; wait for it.
  await expect(async () => {
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId).toBe('stack-title');
  }).toPass({ timeout: 2000 });
});

test('clicking a pane-nav link focuses the target heading', async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  await page.click('a[data-pane-link="uses"]');
  await expect(async () => {
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId).toBe('uses-title');
  }).toPass({ timeout: 2000 });
});

test('aria-current updates to the active pane on scroll', async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  // Scroll the stack pane section into view (not just the heading) so the
  // IntersectionObserver threshold conditions (-24%/−58% rootMargin) can fire.
  await page.locator('#stack[data-pane]').scrollIntoViewIfNeeded();
  // IntersectionObserver fires async; allow a generous window.
  await expect(page.locator('a[data-pane-link="stack"]')).toHaveAttribute(
    'aria-current',
    'true',
    { timeout: 5000 },
  );
});

test('runtime strip transitions wasm/sab/canvas out of pending', async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  // wasm/sab/canvas are resolved on page mount by workspace-wip-client.ts.
  // "search" only transitions after the user opens the search panel, so it
  // is intentionally excluded here (covered by the search-panel test below).
  for (const item of ['wasm', 'sab', 'canvas']) {
    const status = page.locator(`[data-wip-status="${item}"]`);
    // Each status is "pending" at SSR; M5 mount logic flips it to ready / error / off.
    await expect(status).not.toHaveText(/pending/i, { timeout: 5000 });
  }
});

test('search panel opens and closes without error', async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  // Panel is hidden by default.
  await expect(page.locator('#ws-search-panel')).toBeHidden();
  await page.click('#ws-search-trigger');
  await expect(page.locator('#ws-search-panel')).toBeVisible();
  // Close button works.
  await page.click('#ws-search-close');
  await expect(page.locator('#ws-search-panel')).toBeHidden();
});

test('reduced-motion: canvas frame is hidden, prose fills the projects pane', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/workspace#projects`);
  // The canvas-frame block has `display: none` under the Task 1 rule; child <canvas>
  // shouldn't be in the viewport even if the projects pane is.
  const canvas = page.locator('#ws-rust-canvas');
  await expect(canvas).toBeHidden();
  // The prose column ("current build surface" heading) is on screen.
  await expect(page.locator('#projects-title')).toBeInViewport();
  await ctx.close();
});

test('WASM load failure: pane content remains readable, fallback visible', async ({ browser }) => {
  // Block the canvas WASM module to simulate a failure.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route('**/wasm/canvas/**', (route) => route.abort());
  // Navigate directly to the projects pane so it's in the initial viewport.
  await page.goto(`${BASE}/workspace#projects`);
  // Pane content (project list) still renders.
  await expect(page.locator('#projects-title')).toBeInViewport();
  // Visible fallback paragraph inside .canvas-frame.
  await expect(page.locator('.canvas-frame p')).toContainText(/Rust lyon/i);
  // Status flips to "error".
  await expect(page.locator('[data-wip-status="canvas"]')).toHaveAttribute('data-state', 'error', {
    timeout: 5000,
  });
  await ctx.close();
});

test('COOP/COEP headers present on /workspace, absent on /', async ({ request }) => {
  // Smoke depends on the deployed Worker (or `wrangler dev`) honoring the
  // public/_headers + middleware rules. SSR preview server doesn't apply them,
  // so this test runs ONLY against SMOKE_BASE_URL when it's a real Worker URL.
  test.skip(!process.env.SMOKE_BASE_URL, 'header scope requires deployed Worker');
  const ws = await request.get(`${BASE}/workspace`);
  expect(ws.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  expect(ws.headers()['cross-origin-opener-policy']).toBe('same-origin');
  const root = await request.get(`${BASE}/`);
  expect(root.headers()['cross-origin-embedder-policy']).toBeUndefined();
  expect(root.headers()['cross-origin-opener-policy']).toBeUndefined();
});

test('mobile viewport (375px) renders pane-nav as horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/workspace`);
  // Mobile media-query at <860px collapses the sidebar nav into a horizontal scroll row.
  const navBox = await page.locator('.pane-nav').boundingBox();
  expect(navBox).not.toBeNull();
  if (navBox) {
    expect(navBox.width).toBeGreaterThan(navBox.height);
  }
  await ctx.close();
});

test('telemetry pane renders aggregate stat slots', async ({ page }) => {
  await page.goto(`${BASE}/workspace#telemetry`);
  const first = page.locator('[data-telemetry-stat="total-sessions"]');
  if ((await first.count()) === 0) {
    test.skip(
      Boolean(process.env.SMOKE_BASE_URL),
      'target origin does not expose telemetry UI yet (deploy this branch to staging and set SMOKE_BASE_URL there)',
    );
  }
  for (const name of ['total-sessions', 'sessions-30d', 'avg-lcp', 'avg-fps', 'countries', 'devices']) {
    await expect(page.locator(`[data-telemetry-stat="${name}"]`)).toBeAttached();
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
  await page.goto(`${BASE}/workspace`);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(500);
  expect(beaconRequests).toBe(0);
  await ctx.close();
});
