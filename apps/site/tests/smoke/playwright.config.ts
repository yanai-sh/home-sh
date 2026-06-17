import { defineConfig } from "playwright/test";
import { getPublicTurnstileSiteKey } from "./smoke-worker-secrets";

// `cwd` defaults to the config file's directory (apps/site/tests/smoke/).
// `../..` resolves to apps/site so `pnpm run preview` can find package.json.
const publicTurnstileSiteKey = getPublicTurnstileSiteKey();

const accessClientId = process.env.CF_ACCESS_CLIENT_ID?.trim() ?? "";
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim() ?? "";
const accessHeaders =
  accessClientId && accessClientSecret
    ? {
        // Cloudflare Access service token headers (enables smoke against protected preview URLs).
        "CF-Access-Client-Id": accessClientId,
        "CF-Access-Client-Secret": accessClientSecret,
      }
    : undefined;

export default defineConfig({
  testDir: ".",
  use: {
    headless: true,
    ignoreHTTPSErrors: false,
    ...(accessHeaders ? { extraHTTPHeaders: accessHeaders } : {}),
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        // Local preview: build SvelteKit + `wrangler dev` (port 4321).
        command: "pnpm build && pnpm preview",
        cwd: "../..",
        url: "http://localhost:4321/",
        env: {
          ...process.env,
          ...(publicTurnstileSiteKey ? { PUBLIC_TURNSTILE_SITE_KEY: publicTurnstileSiteKey } : {}),
        },
        reuseExistingServer: false,
        timeout: 360_000,
      },
});
