#!/usr/bin/env tsx
/**
 * Delete orphaned home-sh-telemetry (D1) and home-sh-sessions (KV) by name.
 * Safe to run when those resources are no longer in OpenTofu state.
 *
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm exec tsx scripts/destroy-legacy-data-stores.ts
 *   pnpm exec tsx scripts/destroy-legacy-data-stores.ts --dry-run
 */

import { readFileSync } from 'node:fs';

const D1_NAME = 'home-sh-telemetry';
const KV_TITLE = 'home-sh-sessions';
const SECRETS_FILE = 'infra/secrets/worker-secrets.local.json';

type CfList<T> = { success: boolean; result: T[]; errors?: unknown[] };

function loadCreds(): { token: string; accountId: string } {
  const fromEnv = {
    token: process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '',
  };
  if (fromEnv.token && fromEnv.accountId) return fromEnv;

  try {
    const blob = JSON.parse(readFileSync(SECRETS_FILE, 'utf8')) as Record<string, string>;
    const token = blob.cloudflare_api_token?.trim() ?? '';
    const accountId = blob.cloudflare_account_id?.trim() ?? '';
    if (token && accountId) return { token, accountId };
  } catch {
    // fall through
  }

  console.error(
    'Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or add cloudflare_api_token and cloudflare_account_id to infra/secrets/worker-secrets.local.json',
  );
  process.exit(1);
}

async function cf<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers,
  });
  const json = (await res.json()) as { success: boolean; result: T; errors?: unknown[] };
  if (!res.ok || !json.success) {
    throw new Error(`CF API ${res.status} ${path}: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.result;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { token, accountId } = loadCreds();

  const d1List = await cf<Array<{ uuid: string; name: string }>>(
    token,
    `/accounts/${accountId}/d1/database`,
  );
  const d1 = d1List.find((db) => db.name === D1_NAME);

  const kvList = await cf<Array<{ id: string; title: string }>>(
    token,
    `/accounts/${accountId}/storage/kv/namespaces`,
  );
  const kv = kvList.find((ns) => ns.title === KV_TITLE);

  if (!d1 && !kv) {
    console.log('Nothing to delete — neither home-sh-telemetry (D1) nor home-sh-sessions (KV) found.');
    return;
  }

  if (d1) {
    console.log(`Found D1 ${D1_NAME} (${d1.uuid})`);
    if (dryRun) {
      console.log(`[dry-run] would DELETE D1 ${d1.uuid}`);
    } else {
      await cf(token, `/accounts/${accountId}/d1/database/${d1.uuid}`, { method: 'DELETE' });
      console.log(`Deleted D1 ${D1_NAME}`);
    }
  } else {
    console.log(`D1 ${D1_NAME} not found — already gone`);
  }

  if (kv) {
    console.log(`Found KV ${KV_TITLE} (${kv.id})`);
    if (dryRun) {
      console.log(`[dry-run] would DELETE KV ${kv.id}`);
    } else {
      await cf(token, `/accounts/${accountId}/storage/kv/namespaces/${kv.id}`, {
        method: 'DELETE',
      });
      console.log(`Deleted KV ${KV_TITLE}`);
    }
  } else {
    console.log(`KV ${KV_TITLE} not found — already gone`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
