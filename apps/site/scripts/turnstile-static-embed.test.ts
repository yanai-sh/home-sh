import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_SERVER_BUNDLE = path.join(
  SITE_ROOT,
  ".svelte-kit/output/server/entries/pages/_page.server.ts.js",
);
const TEST_SITE_KEY = "0xTEST_SITE_KEY_EMBED";

describe("PUBLIC_TURNSTILE_SITE_KEY static embed", () => {
  it("inlines the site key into the SSR server bundle at build time", () => {
    execSync("pnpm build", {
      cwd: SITE_ROOT,
      env: { ...process.env, PUBLIC_TURNSTILE_SITE_KEY: TEST_SITE_KEY },
      stdio: "pipe",
    });

    expect(existsSync(PAGE_SERVER_BUNDLE)).toBe(true);
    const bundle = readFileSync(PAGE_SERVER_BUNDLE, "utf8");
    expect(bundle).toContain(TEST_SITE_KEY);
  }, 180_000);
});
