import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Walk server output js files for a build-time inlined public env string. */
export function serverBundleContains(serverOut: string, key: string): boolean {
  if (!key) return false;
  const files: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(serverOut);
  return files.some((file) => readFileSync(file, "utf8").includes(key));
}

export function assertTurnstileSiteKeyEmbedded(serverOut: string, key: string): void {
  if (!existsSync(serverOut)) {
    throw new Error(`Missing server build output at ${serverOut} — run vite build first`);
  }
  if (!serverBundleContains(serverOut, key)) {
    throw new Error(
      `PUBLIC_TURNSTILE_SITE_KEY (${key}) not found in server bundle under ${serverOut}`,
    );
  }
}
