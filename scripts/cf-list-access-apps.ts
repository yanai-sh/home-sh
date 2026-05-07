#!/usr/bin/env bun
/**
 * Lists Cloudflare Zero Trust Access applications for the account (domain + id).
 * Use ids with `tofu import` (see infra/ACCESS_WORKERS.md).
 *
 *   bun run scripts/cf-list-access-apps.ts
 *
 * Requires CLOUDFLARE_API_TOKEN (Access: Apps read) and CLOUDFLARE_ACCOUNT_ID.
 */

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set');
  process.exit(1);
}

type CfList<T> = { success: boolean; result: T[]; errors?: { message: string }[] };

type AccessApp = { id: string; name: string; domain?: string };

async function listPage(page: number): Promise<CfList<AccessApp>> {
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`);
  url.searchParams.set('per_page', '50');
  url.searchParams.set('page', String(page));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as CfList<AccessApp>;
  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => e.message).join('; ') ?? res.statusText;
    throw new Error(msg);
  }
  return body;
}

const filter = process.argv[2]?.toLowerCase() ?? '';

const rows: AccessApp[] = [];
for (let page = 1; page <= 20; page += 1) {
  const { result } = await listPage(page);
  rows.push(...result);
  if (result.length < 50) break;
}

let out = rows;
if (filter) {
  out = rows.filter(
    (r) => (r.domain ?? '').toLowerCase().includes(filter) || r.name.toLowerCase().includes(filter),
  );
}

out.sort((a, b) => (a.domain ?? '').localeCompare(b.domain ?? ''));
console.log('id\tdomain\tname');
for (const r of out) {
  console.log(`${r.id}\t${r.domain ?? ''}\t${r.name}`);
}
