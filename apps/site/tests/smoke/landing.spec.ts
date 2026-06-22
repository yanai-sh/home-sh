import { expect, test, type Page } from "playwright/test";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4321";
if (BASE.includes("<") || BASE.includes(">")) {
  throw new Error(
    `SMOKE_BASE_URL looks like a placeholder: ${BASE}\nUse the *actual* preview URL from the deploy output, e.g. https://<hash>-yanai-sh-staging.yanaiklugman.workers.dev`,
  );
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (!error.message.includes("[Cloudflare Turnstile]")) errors.push(error.message);
  });
  return errors;
}

async function waitForSplashClient(page: Page): Promise<void> {
  // ponytail: networkidle never settles on Cloudflare Workers (analytics, Turnstile, etc.)
  await page.waitForLoadState("load");
  await expect(page.locator("[data-splash-ambient]")).toBeAttached();
  await expect(page.locator('button[data-open-split="resume"]')).toBeVisible();
}

async function waitForSplitOpen(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-split-open", "true");
  await expect(page.locator("html")).toHaveCSS("--split-progress", "1");
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("is-split-animating"),
  );
}

test("splash stage renders with resume CTA and CSS ambient layer", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("#shell")).toBeVisible();
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator(".stage-name")).toBeVisible();
  await expect(page.locator("[data-splash-ambient]")).toHaveAttribute(
    "data-splash-ambient-draft",
    "paper-fog",
  );
  await expect(page.locator("[data-splash-ambient]")).toHaveAttribute(
    "data-splash-ambient-ready",
    "still",
  );
  await expect(page.locator('.stage-nav button[data-open-split="resume"]')).toBeVisible();
});

function resolveAssetUrl(base: string, path: string): string {
  return new URL(path.replace(/^\.\//, ""), `${base.replace(/\/$/, "")}/`).href;
}

test("splash CSS and client JS return 200", async ({ page, request }) => {
  await page.goto(`${BASE}/`);
  const html = await page.content();
  const cssMatch = html.match(/href="((?:\.\/)?_app\/immutable\/assets\/[^"]+\.css)"/);
  expect(cssMatch).toBeTruthy();
  const css = await request.get(resolveAssetUrl(BASE, cssMatch![1]));
  expect(css.status()).toBe(200);
  expect(css.headers()["content-type"]).toMatch(/text\/css/);
  const jsMatch = html.match(/import\("((?:\.\/)?_app\/immutable\/[^"]+\.js)"\)/);
  expect(jsMatch).toBeTruthy();
  const js = await request.get(resolveAssetUrl(BASE, jsMatch![1]));
  expect(js.status()).toBe(200);
  expect(js.headers()["content-type"]).toMatch(/javascript/);
});

test("opening resume split shows the themed PDF viewer and download button", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expect(page.locator("#pane-detail")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#chrome-label")).toHaveText("resume.pdf");
  // In-page PDF.js viewer (no sidebar/iframe) + a clear themed download button.
  await expect(page.locator("#resume-viewer")).toBeVisible();
  await expect(page.locator("#pdf-download")).toBeVisible();
});

test("closing resume split hides divider and returns to splash mode", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await page.locator("[data-close-split]").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await expect(page.locator("#pane-detail")).toHaveAttribute("inert", "");
  await expect(page.locator("#pane-detail")).toHaveCSS("opacity", "0");
  await expect(page.locator("html")).toHaveCSS("--split-progress", "0");
});

test("repeat nav click closes an open pane without reopening", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  const resume = page.locator('button[data-open-split="resume"]');
  await resume.click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await waitForSplitOpen(page);
  await resume.click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await expect(page.locator("html")).not.toHaveAttribute("data-split-open");
  await expect(page.locator("html")).toHaveCSS("--split-progress", "0");
});

test("switching panes keeps flyout open and changes mode", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await waitForSplitOpen(page);
  await page.locator('button[data-open-split="contact"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await expect(page.locator("html")).toHaveAttribute("data-split-open", "true");
  await expect(page.locator("#view-contact")).toHaveClass(/is-active/);
  await expect(page.locator("#chrome-label")).toHaveText("contact");
});

test("closing contact split resets flyout state", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="contact"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await page.locator("[data-close-split]").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await expect(page.locator("#pane-detail")).toHaveCSS("opacity", "0");
  await expect(page.locator("html")).toHaveCSS("--split-progress", "0");
});

test("/workspace redirect lands on /", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto(`${BASE}/workspace`);
  expect(page.url()).toMatch(/\/$/);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test("404 returns not-found page", async ({ page }) => {
  const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "commit" });
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
  await expect(page.getByText("This route does not exist.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});

test("reduced-motion: splash ambient stays visible", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = collectPageErrors(page);
  await page.goto(`${BASE}/`);
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("[data-splash-ambient]")).toBeAttached();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("contact split opens from command button", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="contact"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await expect(page.locator("#contact-title")).toBeVisible();
});

test("projects flyout opens from nav and lists project cards", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="projects"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator("#view-projects")).toHaveClass(/is-active/);
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();
});

test("project card in projects flyout opens project detail", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="projects"]').click();
  await page.locator('[data-open-project="winmint"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await expect(page.locator('[data-project-detail="winmint"]:not([hidden])')).toBeVisible();
});

test("project detail back control returns to projects grid", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="projects"]').click();
  await page.locator('[data-open-project="winmint"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await page
    .locator('[data-project-detail="winmint"]:not([hidden]) [data-back-to-projects]')
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator("#view-projects")).toHaveClass(/is-active/);
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();
});

test("source link targets the site repository", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="projects"]').click();
  const card = page.locator('[data-open-project="home-sh"]');
  await expect(card).toBeVisible();
  await expect(card.locator(".project-card__title")).toHaveText("Source code");
  await page.locator('[data-open-project="home-sh"]').click();
  await expect(page.locator("#project-source")).toHaveAttribute(
    "href",
    /github\.com\/yanai-sh\/home-sh/,
  );
});

test("/resume redirects to resume.pdf", async ({ request }) => {
  const response = await request.get(`${BASE}/resume`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toMatch(/\/resume\.pdf$/);
});

test("social glyphs and copy-email control are present under the stage head", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('.stage-glyphs a[aria-label="GitHub"]')).toBeVisible();
  await expect(page.locator('.stage-glyphs button[aria-label="Copy email address"]')).toBeVisible();
});

test("blog index lists a published post", async ({ page }) => {
  await page.goto(`${BASE}/blog`);
  await expect(page.locator("h1")).toContainText("Blog");
  await expect(page.getByRole("link", { name: "Edge-native personal sites" })).toBeVisible();
});

test("robots.txt references a live sitemap", async ({ request }) => {
  const robots = await request.get(`${BASE}/robots.txt`);
  expect(robots.status()).toBe(200);
  const body = await robots.text();
  expect(body).toMatch(/Sitemap:\s+\S+\/sitemap\.xml/);

  const sitemap = await request.get(`${BASE}/sitemap.xml`);
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  const xml = await sitemap.text();
  expect(xml).toContain("https://yanai.sh/uses");
  expect(xml).toContain("/blog/edge-native-personal-sites");
});

test("mobile viewport (375px wide) shows splash without overflow", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator("#splash")).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
  await ctx.close();
});

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
}

test("mobile viewport: document routes fit without horizontal overflow", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();

  for (const path of ["/blog", "/uses", "/now"]) {
    await page.goto(`${BASE}${path}`);
    await expectNoHorizontalOverflow(page);
  }

  await ctx.close();
});

test("mobile viewport: resume flyout fits without horizontal overflow", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await waitForSplashClient(page);
  await page.locator('button[data-open-split="resume"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expectNoHorizontalOverflow(page);
  await ctx.close();
});
