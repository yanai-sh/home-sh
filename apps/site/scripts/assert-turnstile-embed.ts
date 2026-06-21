import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTurnstileSiteKeyEmbedded } from "./lib/turnstile-embed-assert.ts";

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_OUT = path.join(SITE_ROOT, ".svelte-kit/output/server");
const siteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

if (!siteKey) {
  console.log("[assert-turnstile-embed] skip — PUBLIC_TURNSTILE_SITE_KEY not set");
  process.exit(0);
}

assertTurnstileSiteKeyEmbedded(SERVER_OUT, siteKey);
console.log("[assert-turnstile-embed] ok — site key present in server bundle");
