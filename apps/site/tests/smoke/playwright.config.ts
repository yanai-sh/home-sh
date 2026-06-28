import { defineConfig } from "playwright/test";
import { getPublicTurnstileSiteKey } from "./smoke-worker-secrets";

const publicTurnstileSiteKey = getPublicTurnstileSiteKey();

const accessClientId = process.env.CF_ACCESS_CLIENT_ID?.trim() ?? "";
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim() ?? "";
const accessHeaders =
  accessClientId && accessClientSecret
    ? {
        "CF-Access-Client-Id": accessClientId,
        "CF-Access-Client-Secret": accessClientSecret,
      }
    : undefined;

export default defineConfig({
  testDir: ".",
  globalSetup: "./global-setup.ts",
  use: {
    headless: true,
    ignoreHTTPSErrors: false,
    ...(accessHeaders ? { extraHTTPHeaders: accessHeaders } : {}),
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: "nub run build && nub run preview",
        cwd: "../..",
        url: "http://localhost:4321/",
        env: {
          ...process.env,
          NODE_COMPAT: "1",
          ...(publicTurnstileSiteKey ? { PUBLIC_TURNSTILE_SITE_KEY: publicTurnstileSiteKey } : {}),
        },
        reuseExistingServer: true,
        timeout: 360_000,
      },
});
