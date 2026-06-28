import { expect, test } from "playwright/test";
import {
  BASE,
  expectNoHorizontalOverflow,
  openSplashDeck,
  resolveAssetUrl,
  restNav,
} from "./helpers";

test("bundled CSS and client JS return 200", async ({ page, request }) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const html = await page.content();
  const cssMatch = html.match(/href="((?:\.\/)?_app\/immutable\/assets\/[^"]+\.css)"/);
  expect(cssMatch).toBeTruthy();
  const css = await request.get(resolveAssetUrl(cssMatch![1]));
  expect(css.status()).toBe(200);
  expect(css.headers()["content-type"]).toMatch(/text\/css/);

  const jsMatch = html.match(/import\("((?:\.\/)?_app\/immutable\/[^"]+\.js)"\)/);
  expect(jsMatch).toBeTruthy();
  const js = await request.get(resolveAssetUrl(jsMatch![1]));
  expect(js.status()).toBe(200);
  expect(js.headers()["content-type"]).toMatch(/javascript/);
});

test("/workspace redirect lands on splash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (!error.message.includes("[Cloudflare Turnstile]")) errors.push(error.message);
  });
  await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
  expect(page.url()).toMatch(/\/$/);
  await expect(page.locator("#splash")).toBeVisible();
  expect(errors).toEqual([]);
});

test("404 returns not-found page", async ({ page }) => {
  const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "commit" });
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});

test("blog index lists a published post", async ({ page }) => {
  await page.goto(`${BASE}/blog`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Blog");
  await expect(page.getByRole("link", { name: "Edge-native personal sites" })).toBeVisible();
});

test("reduced-motion keeps splash ambient visible", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("[data-splash-ambient]")).toBeAttached();
  await ctx.close();
});

test("mobile viewports avoid horizontal overflow", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#splash")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const path of ["/blog", "/uses", "/now"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page);
  }

  await openSplashDeck(page);
  await restNav(page, "resume").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expectNoHorizontalOverflow(page);

  await ctx.close();
});
