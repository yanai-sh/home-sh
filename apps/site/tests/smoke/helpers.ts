import { expect, type Page } from "playwright/test";

export const BASE = (() => {
  const url = process.env.SMOKE_BASE_URL ?? "http://localhost:4321";
  if (url.includes("<") || url.includes(">")) {
    throw new Error(
      `SMOKE_BASE_URL looks like a placeholder: ${url}\nUse the deployed preview URL from deploy output.`,
    );
  }
  return url.replace(/\/$/, "");
})();

export function restNav(page: Page, dest: "resume" | "contact" | "projects") {
  return page.locator(`.splash-deck__nav button[data-splash-open="${dest}"]`);
}

export function deckMap(page: Page, dest: "resume" | "contact" | "projects") {
  return page.locator(`button[data-splash-map="${dest}"]`);
}

/** Canvas lab only — trick-room nav ring at `/labs/splash-canvas`. */
export function canvasNav(page: Page, dest: "resume" | "contact" | "projects") {
  return page.locator(`button[data-splash-nav="${dest}"]`);
}

export async function openSplash(page: Page): Promise<void> {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("[data-splash-ambient]")).toBeAttached();
  await expect(restNav(page, "resume")).toBeVisible();
}

/** Simulate a compass pan swipe on the splash gesture surface (not scroll/pane chrome). */
export async function panSwipe(
  page: Page,
  opts: { dx: number; dy: number; from?: { x: number; y: number } },
): Promise<void> {
  const splash = page.locator("#splash");
  const box = await splash.boundingBox();
  if (!box) throw new Error("#splash bounding box unavailable");

  const from = opts.from ?? { x: 0.5, y: 0.35 };
  const startX = box.x + box.width * from.x;
  const startY = box.y + box.height * from.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + opts.dx, startY + opts.dy, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(380);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
}

export function resolveAssetUrl(path: string): string {
  return new URL(path.replace(/^\.\//, ""), `${BASE}/`).href;
}
