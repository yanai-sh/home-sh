import { readFileSync } from "node:fs";

const STORE_ID = "02000d0490be49b09eed0e6d95c08e99";

const MANAGED: Record<string, string> = {
  turnstile_secret: "TURNSTILE_SECRET",
  resend_api_key: "RESEND_API_KEY",
  contact_from: "CONTACT_FROM",
  contact_to: "CONTACT_TO",
  resume_repo_token: "RESUME_REPO_TOKEN",
};

const DEFAULT_SECRETS_FILE = "infra/secrets/worker-secrets.local.json";

type Secret = { id: string; name: string };

function resolveCfCreds(
  secretsBlob: Record<string, string> | null,
): { token: string; accountId: string } | null {
  const token =
    process.env.CLOUDFLARE_API_TOKEN?.trim() || secretsBlob?.cloudflare_api_token?.trim() || "";
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || secretsBlob?.cloudflare_account_id?.trim() || "";
  if (!token || !accountId) return null;
  return { token, accountId };
}

async function cf<T>(base: string, token: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
  });
  const json = (await res.json()) as { success: boolean; result: T; errors: unknown[] };
  if (!json.success) {
    throw new Error(`CF API ${res.status}: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

function loadFromEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [jsonKey, bindingName] of Object.entries(MANAGED)) {
    const v = process.env[bindingName];
    if (typeof v === "string" && v.length > 0) {
      out[jsonKey] = v;
    }
  }
  return out;
}

function loadFromFile(): Record<string, string> {
  const path = process.env.WORKER_SECRETS_FILE ?? DEFAULT_SECRETS_FILE;
  try {
    readFileSync(path, "utf8");
  } catch {
    console.error(
      `Missing ${path}. Copy from infra/secrets/worker-secrets.example.json or set PUSH_SECRETS_FROM_ENV=1.`,
    );
    process.exit(1);
  }
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as Record<string, string>;
}

async function loadWorkerSecrets(): Promise<Record<string, string>> {
  if (process.env.PUSH_SECRETS_FROM_ENV === "1") {
    return loadFromEnv();
  }
  return loadFromFile();
}

async function main(): Promise<void> {
  const blob = await loadWorkerSecrets();
  const creds = resolveCfCreds(process.env.PUSH_SECRETS_FROM_ENV === "1" ? null : blob);
  if (!creds) {
    console.error(
      "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID: set in env, or add cloudflare_api_token and cloudflare_account_id to worker-secrets JSON",
    );
    process.exit(1);
  }
  const base = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/secrets_store/stores/${STORE_ID}/secrets`;

  const existing = await cf<Secret[]>(base, creds.token, "");
  const byName = new Map(existing.map((s) => [s.name, s]));

  const toCreate: { name: string; value: string; scopes: ["workers"]; comment: string }[] = [];

  for (const [jsonKey, bindingName] of Object.entries(MANAGED)) {
    const value = blob[jsonKey];
    if (typeof value !== "string" || value.length === 0) {
      console.warn(`skip ${bindingName}: missing or empty under '${jsonKey}'`);
      continue;
    }

    const found = byName.get(bindingName);
    if (found) {
      await cf(base, creds.token, `/${found.id}`, {
        method: "PATCH",
        body: JSON.stringify({ value, scopes: ["workers"] }),
      });
      console.log(`updated ${bindingName}`);
    } else {
      toCreate.push({
        name: bindingName,
        value,
        scopes: ["workers"],
        comment: "managed by scripts/push-secrets.ts",
      });
    }
  }

  if (toCreate.length > 0) {
    await cf(base, creds.token, "", { method: "POST", body: JSON.stringify(toCreate) });
    for (const s of toCreate) console.log(`created ${s.name}`);
  }

  console.log(`done — ${existing.length + toCreate.length} secrets in store ${STORE_ID}`);
}

await main();
