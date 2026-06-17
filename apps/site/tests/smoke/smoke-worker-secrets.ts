import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo-root `infra/secrets/worker-secrets.local.json` (Bitwarden importer writes here). */
function workerSecretsPath(): string {
  const smokeDir = fileURLToPath(new URL(".", import.meta.url));
  return resolve(smokeDir, "../../../../infra/secrets/worker-secrets.local.json");
}

/** Same value direnv would export as `PUBLIC_TURNSTILE_SITE_KEY` from `public_turnstile_site_key`. */
export function getPublicTurnstileSiteKey(): string | undefined {
  const fromEnv = process.env.PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (fromEnv) return fromEnv;
  const path = workerSecretsPath();
  if (!existsSync(path)) return undefined;
  try {
    const j = JSON.parse(readFileSync(path, "utf8")) as {
      public_turnstile_site_key?: string;
    };
    return j.public_turnstile_site_key?.trim() || undefined;
  } catch {
    return undefined;
  }
}
