/**
 * Merge local Worker secrets into gitignored apps/site/.dev.vars and .env so
 * `vite dev` (Cloudflare Vite plugin + SvelteKit private env) can serve /resume.pdf.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(siteRoot, "../..");
const devVarsPath = resolve(siteRoot, ".dev.vars");
const envPath = resolve(siteRoot, ".env");
const secretsPath = resolve(repoRoot, "infra/secrets/worker-secrets.local.json");

const DEV_VAR_KEYS_FROM_SECRETS: Record<string, string> = {
  RESUME_REPO_TOKEN: "resume_repo_token",
  TURNSTILE_SECRET: "turnstile_secret",
  RESEND_API_KEY: "resend_api_key",
  CONTACT_FROM: "contact_from",
  CONTACT_TO: "contact_to",
};

function parseKeyValueFile(content: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return vars;
}

function readKeyValueFile(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map();
  return parseKeyValueFile(readFileSync(path, "utf8"));
}

function readWorkerSecrets(): Record<string, string> {
  if (!existsSync(secretsPath)) return {};
  try {
    return JSON.parse(readFileSync(secretsPath, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

const WINDOWS_GH = "C:\\Program Files\\GitHub CLI\\gh.exe";

function ghAuthToken(): string | undefined {
  const commands = [
    "gh auth token -u yanai-sh",
    "gh auth token",
    `"/mnt/c/Program Files/GitHub CLI/gh.exe" auth token -u yanai-sh`,
    `"/mnt/c/Program Files/GitHub CLI/gh.exe" auth token`,
  ];

  if (process.platform === "win32" && existsSync(WINDOWS_GH)) {
    commands.unshift(`"${WINDOWS_GH}" auth token -u yanai-sh`, `"${WINDOWS_GH}" auth token`);
  }

  for (const command of commands) {
    try {
      const token = execSync(command, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        shell: process.platform === "win32" ? true : "/bin/bash",
      }).trim();
      if (token) return token;
    } catch {
      // try next
    }
  }
  return undefined;
}

function resolveResumeToken(secrets: Record<string, string>): string | undefined {
  const fromEnv =
    process.env.RESUME_REPO_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const fromSecrets = secrets.resume_repo_token?.trim();
  if (fromSecrets) return fromSecrets;

  return ghAuthToken();
}

function serializeKeyValueFile(vars: Map<string, string>): string {
  return `${[...vars.entries()].map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

function mergeMissingKeys(target: Map<string, string>, source: Map<string, string>): void {
  for (const [key, value] of source) {
    if (!target.has(key)) target.set(key, value);
  }
}

const devVars = readKeyValueFile(devVarsPath);
const dotEnv = readKeyValueFile(envPath);
const secrets = readWorkerSecrets();

for (const [devKey, secretKey] of Object.entries(DEV_VAR_KEYS_FROM_SECRETS)) {
  if (devVars.has(devKey)) continue;
  const value = secrets[secretKey]?.trim();
  if (value) devVars.set(devKey, value);
}

if (!devVars.has("RESUME_REPO_TOKEN")) {
  const resumeToken = resolveResumeToken(secrets);
  if (resumeToken) devVars.set("RESUME_REPO_TOKEN", resumeToken);
}

mergeMissingKeys(dotEnv, devVars);

writeFileSync(devVarsPath, serializeKeyValueFile(devVars), "utf8");
writeFileSync(envPath, serializeKeyValueFile(dotEnv), "utf8");

if (devVars.has("RESUME_REPO_TOKEN")) {
  process.stdout.write(
    "sync-dev-vars: RESUME_REPO_TOKEN ready in apps/site/.dev.vars and .env\n",
  );
} else {
  process.stderr.write(
    "sync-dev-vars: no resume token found (gh auth, worker-secrets.local.json, or env) — /resume.pdf may 503 locally\n",
  );
}
