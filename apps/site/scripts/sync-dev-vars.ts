/**
 * Merge local résumé + Worker secrets into gitignored apps/site/.dev.vars so
 * `vite dev` / `wrangler dev` can serve /resume.pdf without manual copy-paste.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(siteRoot, "../..");
const devVarsPath = resolve(siteRoot, ".dev.vars");
const secretsPath = resolve(repoRoot, "infra/secrets/worker-secrets.local.json");

const DEV_VAR_KEYS_FROM_SECRETS: Record<string, string> = {
  RESUME_REPO_TOKEN: "resume_repo_token",
  TURNSTILE_SECRET: "turnstile_secret",
  RESEND_API_KEY: "resend_api_key",
  CONTACT_FROM: "contact_from",
  CONTACT_TO: "contact_to",
};

function parseDevVars(content: string): Map<string, string> {
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

function readDevVarsFile(): Map<string, string> {
  if (!existsSync(devVarsPath)) return new Map();
  return parseDevVars(readFileSync(devVarsPath, "utf8"));
}

function readWorkerSecrets(): Record<string, string> {
  if (!existsSync(secretsPath)) return {};
  try {
    return JSON.parse(readFileSync(secretsPath, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function ghAuthToken(): string | undefined {
  try {
    const token = execSync("gh auth token -u yanai-sh", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
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

function serializeDevVars(vars: Map<string, string>): string {
  return `${[...vars.entries()].map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

const vars = readDevVarsFile();
const secrets = readWorkerSecrets();

for (const [devKey, secretKey] of Object.entries(DEV_VAR_KEYS_FROM_SECRETS)) {
  if (vars.has(devKey)) continue;
  const value = secrets[secretKey]?.trim();
  if (value) vars.set(devKey, value);
}

if (!vars.has("RESUME_REPO_TOKEN")) {
  const resumeToken = resolveResumeToken(secrets);
  if (resumeToken) vars.set("RESUME_REPO_TOKEN", resumeToken);
}

writeFileSync(devVarsPath, serializeDevVars(vars), "utf8");

if (vars.has("RESUME_REPO_TOKEN")) {
  process.stdout.write("sync-dev-vars: RESUME_REPO_TOKEN ready in apps/site/.dev.vars\n");
} else {
  process.stderr.write(
    "sync-dev-vars: no resume token found (gh auth, worker-secrets.local.json, or env) — /resume.pdf may 503 locally\n",
  );
}
