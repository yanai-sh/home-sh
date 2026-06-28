import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Fail fast when local smoke runs without a prior `build` / `verify`. */
export default function globalSetup(): void {
  if (process.env.SMOKE_BASE_URL?.trim()) return;

  const siteRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const worker = resolve(siteRoot, ".svelte-kit/cloudflare/_worker.js");
  if (existsSync(worker)) return;

  throw new Error(
    [
      "Smoke needs a production build at apps/site/.svelte-kit/cloudflare/.",
      "Run `npm run agent:qa` or `npm run agent:verify` then `npm run agent:smoke`.",
      "Or point at a deployed origin: SMOKE_BASE_URL=https://… nub run smoke",
    ].join("\n"),
  );
}
