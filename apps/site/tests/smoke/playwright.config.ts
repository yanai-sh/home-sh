import { defineConfig } from 'playwright/test';

// `cwd` defaults to the config file's directory (apps/site/tests/smoke/).
// `../..` resolves to apps/site so `bun run preview` can find package.json.
export default defineConfig({
  testDir: '.',
  use: {
    headless: true,
    ignoreHTTPSErrors: false,
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        // `/resume.pdf` is an SSR route (GitHub Release proxy). Local smoke can
        // set `RESUME_REPO_TOKEN` or use `SMOKE_BASE_URL` against production.
        command: 'bun run build && bun run preview',
        cwd: '../..',
        url: 'http://localhost:4321/',
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
