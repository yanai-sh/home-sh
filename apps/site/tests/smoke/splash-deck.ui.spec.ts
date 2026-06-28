import { expect, test } from "playwright/test";
import { BASE, deckMap, openSplashDeck, restNav, waitSplashSettled } from "./helpers";

test.use({ viewport: { width: 375, height: 812 } });

test("splash deck interaction flow", async ({ page }) => {
  await openSplashDeck(page);

  await expect(page.locator("[data-splash-ambient]")).toBeAttached();
  await expect(page.locator('.stage-glyphs a[aria-label="GitHub"]')).toBeVisible();
  await expect(page.locator('.stage-glyphs button[aria-label="Copy email address"]')).toBeVisible();
  await expect(page.locator(".splash-deck__name")).toBeVisible();
  await expect(page.locator(".splash-deck.splash-deck--open")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "false");

  await restNav(page, "projects").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "true");
  await expect(page.locator(".splash-deck.splash-deck--open")).toBeVisible();
  await expect(page.locator(".splash-deck__slot--active")).toBeVisible();
  await expect(page.locator("#contact-form")).toHaveCount(0);
  await expect(page.locator("#resume-viewer")).toHaveCount(0);
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();

  await deckMap(page, "resume").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expect(page.locator("html")).toHaveAttribute("data-splash-active", "resume");
  await expect(page.locator("#resume-viewer")).toHaveCount(1);
  await expect(page.locator("#contact-form")).toHaveCount(0);
  await expect(page.locator("#pdf-download")).toBeVisible();
  await expect(page.locator("#pdf-open")).toHaveAttribute("href", /\/resume\.pdf$/);

  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "false");
  await expect(page.locator(".splash-deck.splash-deck--open")).toHaveCount(0);

  await restNav(page, "resume").click();
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "true");
  await waitSplashSettled(page);
  await page.locator(".splash-deck__name--live").evaluate((node) => (node as HTMLElement).click());
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "false");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");

  await restNav(page, "resume").click();
  await deckMap(page, "contact").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await expect(page.locator("#contact-form")).toHaveCount(1);
  await expect(page.locator("#resume-viewer")).toHaveCount(0);
  await expect(page.locator("#contact-title")).toBeVisible();
  await page.keyboard.press("Escape");

  await restNav(page, "projects").click();
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();
  await waitSplashSettled(page);
  await page.locator('[data-open-project="winmint"]').click({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await expect(page.locator('[data-project-detail="winmint"]')).toBeVisible();
  await page
    .locator('.deck-pane--project[data-project-detail="winmint"] [data-back-to-projects]')
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");

  const sourceCard = page.locator('[data-open-project="home-sh"]');
  await expect(sourceCard.locator(".project-card__title")).toHaveText("Source code");
  await sourceCard.click();
  await expect(page.locator("#project-source")).toHaveAttribute(
    "href",
    /github\.com\/yanai-sh\/home-sh/,
  );
});

test("deck arrow keys step resume and projects", async ({ page }) => {
  await openSplashDeck(page);
  await restNav(page, "resume").click();
  await expect(page.locator("html")).toHaveAttribute("data-splash-active", "resume");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator("html")).toHaveAttribute("data-splash-active", "projects");

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
});

test("hash #projects opens deck pane", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/#projects`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash-deck")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();
});

test("hash #resume opens deck pane", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/#resume`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash-deck")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expect(page.locator("#pdf-open")).toBeVisible();
});

test("hash #p/slug opens deck project detail", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/#p/winmint`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash-deck")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await expect(page.locator('.deck-pane--project[data-project-detail="winmint"]')).toBeVisible();
});

test("contact deck arrows step panes", async ({ page }) => {
  await openSplashDeck(page);
  await restNav(page, "contact").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await waitSplashSettled(page);

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
});

test("inline resume PDF renders or shows fallback", async ({ page }) => {
  test.setTimeout(45_000);
  await openSplashDeck(page);
  await restNav(page, "resume").click();
  await waitSplashSettled(page);
  await expect(page.locator("#resume-viewer")).toBeVisible();

  const pages = page.locator("#pdf-pages");
  await expect
    .poll(
      async () => {
        const rendered = await pages.getAttribute("data-rendered");
        const fallbackVisible = await page.locator("#pdf-fallback.is-visible").count();
        return rendered === "true" || fallbackVisible > 0;
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  if ((await pages.getAttribute("data-rendered")) === "true") {
    await expect(pages.locator("canvas.resume-page").first()).toBeVisible();
  } else {
    await expect(page.locator("#pdf-fallback-link")).toBeVisible();
  }
});
