// Pushes runtime secrets from the SOPS-encrypted source-of-truth
// (infra/tofu/secrets.enc.json) into the Cloudflare Workers Secrets Store
// for the yanai-sh-prod store. Idempotent: creates on first run, updates
// on subsequent runs. Values are streamed in-memory only — never written
// to argv (which would land in shell history) or to disk.
//
// Run via:  bun run scripts/push-secrets.ts
// Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (loaded by direnv)
// and the SOPS age key at $SOPS_AGE_KEY_FILE.

import { spawnSync } from 'node:child_process';

const STORE_ID = '02000d0490be49b09eed0e6d95c08e99';
const SOPS_PATH = 'infra/tofu/secrets.enc.json';

// SOPS-key (lowercase) → Worker binding name (UPPERCASE).
const MANAGED: Record<string, string> = {
  turnstile_secret: 'TURNSTILE_SECRET',
  resend_api_key: 'RESEND_API_KEY',
  contact_from: 'CONTACT_FROM',
  contact_to: 'CONTACT_TO',
};

type Secret = { id: string; name: string };

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set (direnv)');
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores/${STORE_ID}/secrets`;

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { success: boolean; result: T; errors: unknown[] };
  if (!json.success) {
    throw new Error(`CF API ${res.status}: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

function decryptSops(): Record<string, string> {
  const proc = spawnSync('sops', ['--decrypt', '--input-type', 'json', '--output-type', 'json', SOPS_PATH], {
    encoding: 'utf8',
  });
  if (proc.status !== 0) {
    throw new Error(`sops decrypt failed: ${proc.stderr}`);
  }
  return JSON.parse(proc.stdout) as Record<string, string>;
}

async function main(): Promise<void> {
  const secrets = decryptSops();
  const existing = await cf<Secret[]>('');
  const byName = new Map(existing.map((s) => [s.name, s]));

  const toCreate: { name: string; value: string; scopes: ['workers']; comment: string }[] = [];

  for (const [sopsKey, bindingName] of Object.entries(MANAGED)) {
    const value = secrets[sopsKey];
    if (typeof value !== 'string' || value.length === 0) {
      console.warn(`skip ${bindingName}: missing in SOPS under '${sopsKey}'`);
      continue;
    }

    const found = byName.get(bindingName);
    if (found) {
      await cf(`/${found.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ value, scopes: ['workers'] }),
      });
      console.log(`updated ${bindingName}`);
    } else {
      toCreate.push({
        name: bindingName,
        value,
        scopes: ['workers'],
        comment: 'managed by scripts/push-secrets.ts',
      });
    }
  }

  if (toCreate.length > 0) {
    await cf('', { method: 'POST', body: JSON.stringify(toCreate) });
    for (const s of toCreate) console.log(`created ${s.name}`);
  }

  console.log(`done — ${existing.length + toCreate.length} secrets in store ${STORE_ID}`);
}

await main();
