import { expect, test } from "playwright/test";
import { BASE, openSplashSplit, splitNav, waitSplashSettled } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

test("split interaction flow", async ({ page }) => {
  test.setTimeout(60_000);
  await openSplashSplit(page);

  await expect(page.locator(".stage-name")).toBeVisible();
  await expect(page.locator("#split-divider")).toBeAttached();
  await expect(page.locator("html")).not.toHaveAttribute("data-split-open", "true");
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "false");

  await splitNav(page, "projects").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator("html")).toHaveAttribute("data-split-open", "true");
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "true");
  await expect(page.locator("#pane-detail")).not.toHaveAttribute("inert");
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();

  await splitNav(page, "resume").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expect(page.locator("#resume-viewer")).toBeVisible();
  await expect(page.locator("#pdf-download")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await expect(page.locator("html")).toHaveAttribute("data-splash-open", "false");

  await splitNav(page, "contact").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await expect(page.locator("#contact-form")).toBeVisible();
  await page.keyboard.press("Escape");

  await splitNav(page, "projects").click();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await waitSplashSettled(page);
  await page
    .locator('#view-projects [data-open-project="winmint"]')
    .evaluate((node) => (node as HTMLElement).click());
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await expect(page.locator('.project-detail-shell[data-project-detail="winmint"]')).toBeVisible();
  await page
    .locator('.project-detail-shell[data-project-detail="winmint"] [data-back-to-projects]')
    .evaluate((node) => (node as HTMLElement).click());
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");

  const sourceCard = page.locator('#view-projects [data-open-project="home-sh"]');
  await expect(sourceCard.locator(".project-card__title")).toHaveText("Source code");
  await waitSplashSettled(page);
  await sourceCard.evaluate((node) => (node as HTMLElement).click());
  await expect(page.locator("#project-source")).toHaveAttribute(
    "href",
    /github\.com\/yanai-sh\/home-sh/,
  );
});

test("c shortcut opens contact from splash stage", async ({ page }) => {
  await openSplashSplit(page);
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "splash");
  await page.keyboard.press("c");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "contact");
  await expect(page.locator("#contact-form")).toBeVisible();
});

test("hash #projects opens split pane", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/#projects`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#shell")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "projects");
  await expect(page.locator('[data-open-project="winmint"]')).toBeVisible();
});

test("hash #resume opens split pane", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/#resume`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#shell")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "resume");
  await expect(page.locator("#pdf-open")).toBeVisible();
});

test("hash #p/slug opens split project detail", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/#p/winmint`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#shell")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "project");
  await expect(page.locator('.project-detail-shell[data-project-detail="winmint"]')).toBeVisible();
});

test("split resume pane exposes PDF actions", async ({ page }) => {
  await openSplashSplit(page);
  await splitNav(page, "resume").click();
  await waitSplashSettled(page);
  await expect(page.locator("#view-resume #resume-viewer")).toBeVisible();
  await expect(page.locator("#pdf-open")).toHaveAttribute("href", /\/resume\.pdf$/);
  await expect(page.locator("#pdf-download")).toHaveAttribute("href", /\/resume\.pdf$/);
});
