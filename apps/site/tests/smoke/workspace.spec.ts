// apps/site/tests/smoke/workspace.spec.ts
import { expect, test } from 'playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4321';

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

test('search strip item transitions out of pending when panel is opened', async ({ page }) => {
  // The search Worker uses dynamic WASM import; the wrangler miniflare runtime
  // used by `astro preview` does not resolve the Worker message reliably, so
  // this test only runs against a real deployed Worker URL.
  test.skip(!process.env.SMOKE_BASE_URL, 'search WASM worker requires deployed Worker runtime');
  await page.goto(`${BASE}/workspace`);
  // "search" stays "pending" until the search panel is first opened.
  await expect(page.locator('[data-wip-status="search"]')).toHaveText(/pending/i);
  await page.click('#ws-search-trigger');
  // Opening the panel triggers the Worker init and flips the status.
  await expect(page.locator('[data-wip-status="search"]')).not.toHaveText(/pending/i, {
    timeout: 8000,
  });
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
