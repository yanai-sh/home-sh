// Optional: import from Bitwarden CLI into worker-secrets.local.json and/or GitHub.
// Not used by CI or verify. Requires bw + BW_SESSION; --gh needs gh.
//
// Default item title: Cloudflare Secrets (override BITWARDEN_ITEM / BITWARDEN_ITEM_ID).

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_ITEM = 'Cloudflare Secrets';
const OUT_FILE = 'infra/secrets/worker-secrets.local.json';

const BW_FIELD_TO_JSON: Record<string, string> = {
  TURNSTILE_SECRET: 'turnstile_secret',
  RESEND_API_KEY: 'resend_api_key',
  CONTACT_FROM: 'contact_from',
  CONTACT_TO: 'contact_to',
  RESUME_REPO_TOKEN: 'resume_repo_token',
  RESUME_GITHUB_TOKEN: 'resume_repo_token',
  PUBLIC_TURNSTILE_SITE_KEY: 'public_turnstile_site_key',
  CLOUDFLARE_API_TOKEN: 'cloudflare_api_token',
  CLOUDFLARE_ACCOUNT_ID: 'cloudflare_account_id',
};

const ALLOWED_JSON_KEYS = new Set(Object.values(BW_FIELD_TO_JSON));

const JSON_TO_GH: Record<string, string> = {
  turnstile_secret: 'TURNSTILE_SECRET',
  resend_api_key: 'RESEND_API_KEY',
  contact_from: 'CONTACT_FROM',
  contact_to: 'CONTACT_TO',
  resume_repo_token: 'RESUME_REPO_TOKEN',
  public_turnstile_site_key: 'PUBLIC_TURNSTILE_SITE_KEY',
  cloudflare_api_token: 'CLOUDFLARE_API_TOKEN',
  cloudflare_account_id: 'CLOUDFLARE_ACCOUNT_ID',
};

type BwField = { name?: string; value?: string | null };
type BwItem = { id?: string; name?: string; fields?: BwField[] };

function bwRun(
  session: string,
  args: string[],
): { ok: true; stdout: string } | { ok: false; stderr: string; stdout: string } {
  const proc = spawnSync('bw', [...args, '--session', session], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    return { ok: false, stderr: proc.stderr ?? '', stdout: proc.stdout ?? '' };
  }
  return { ok: true, stdout: proc.stdout ?? '' };
}

function bwGetItemByQuery(session: string, itemQuery: string): BwItem {
  const r = bwRun(session, ['get', 'item', itemQuery]);
  if (!r.ok) {
    throw new Error(r.stderr.trim() || r.stdout.trim() || 'bw get item failed');
  }
  return JSON.parse(r.stdout) as BwItem;
}

function bwListItemsSearch(session: string, term: string): BwItem[] {
  const r = bwRun(session, ['list', 'items', '--search', term]);
  if (!r.ok) {
    throw new Error(r.stderr.trim() || 'bw list items failed');
  }
  const parsed = JSON.parse(r.stdout) as unknown;
  return Array.isArray(parsed) ? (parsed as BwItem[]) : [];
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function resolveItem(session: string): BwItem {
  const id = process.env.BITWARDEN_ITEM_ID?.trim();
  if (id) {
    if (!isUuid(id)) {
      throw new Error(`BITWARDEN_ITEM_ID must be a uuid, got: ${id}`);
    }
    return bwGetItemByQuery(session, id);
  }

  const nameQuery = (process.env.BITWARDEN_ITEM ?? DEFAULT_ITEM).trim();
  const direct = bwRun(session, ['get', 'item', nameQuery]);
  if (direct.ok) {
    return JSON.parse(direct.stdout) as BwItem;
  }

  const errText = direct.stderr.trim() || direct.stdout.trim() || 'bw get item failed';
  if (!errText.includes('Not found')) {
    throw new Error(errText);
  }

  const candidates = bwListItemsSearch(session, nameQuery);
  const exact = candidates.filter((i) => (i.name ?? '').trim() === nameQuery);
  const pick = exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : null;
  if (pick?.id) {
    return bwGetItemByQuery(session, pick.id);
  }

  if (candidates.length > 1) {
    const lines = candidates
      .slice(0, 15)
      .map((i) => `  - ${i.id ?? '?'}  ${(i.name ?? '').trim() || '(no name)'}`)
      .join('\n');
    throw new Error(
      `bw get item "${nameQuery}" not found. Search returned ${candidates.length} matches; none named exactly that.\n${lines}\nSet BITWARDEN_ITEM_ID to the correct id.`,
    );
  }

  const tail = (nameQuery.includes('/') ? nameQuery.split('/').pop() : '')?.trim() ?? '';
  if (tail.length > 0 && tail !== nameQuery) {
    const broader = bwListItemsSearch(session, tail);
    const exactBroader = broader.filter((i) => (i.name ?? '').trim() === tail);
    const one =
      exactBroader.length === 1 ? exactBroader[0] : broader.length === 1 ? broader[0] : null;
    if (one?.id) {
      return bwGetItemByQuery(session, one.id);
    }
    if (broader.length > 1) {
      const lines = broader
        .slice(0, 15)
        .map((i) => `  - ${i.id ?? '?'}  ${(i.name ?? '').trim() || '(no name)'}`)
        .join('\n');
      throw new Error(
        `Several items match "${tail}". Pick one:\n${lines}\nexport BITWARDEN_ITEM_ID=<uuid>`,
      );
    }
  }

  const hint =
    '\nRun `bw sync`, set BITWARDEN_ITEM to the vault item title, or BITWARDEN_ITEM_ID to its uuid (`bw list items --search …`).';

  throw new Error(`bw get item "${nameQuery}" not found.${hint}`);
}

function fieldsToJson(item: BwItem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of item.fields ?? []) {
    const rawName = f.name?.trim();
    if (!rawName) continue;
    const jsonKey =
      BW_FIELD_TO_JSON[rawName] ??
      BW_FIELD_TO_JSON[rawName.toUpperCase()] ??
      (/^[a-z][a-z0-9_]+$/.test(rawName) ? rawName : undefined);
    if (!jsonKey || !ALLOWED_JSON_KEYS.has(jsonKey)) continue;
    const v = f.value;
    if (typeof v === 'string' && v.length > 0) {
      out[jsonKey] = v;
    }
  }
  return out;
}

function parseArgs(): { dryRun: boolean; write: boolean; gh: boolean } {
  const dryRun = process.argv.includes('--dry-run');
  const write = process.argv.includes('--write');
  const gh = process.argv.includes('--gh');
  return { dryRun, write, gh };
}

function ghSecretSet(name: string, value: string): void {
  const proc = spawnSync('gh', ['secret', 'set', name], {
    encoding: 'utf8',
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (proc.status !== 0) {
    throw new Error(`gh secret set ${name} failed: ${proc.stderr}`);
  }
}

const session = process.env.BW_SESSION;
const { dryRun, write, gh } = parseArgs();

if (!session) {
  console.error('Set BW_SESSION (e.g. export BW_SESSION=$(bw unlock --raw))');
  process.exit(1);
}

if (!dryRun && !write && !gh) {
  console.error('Pass one of: --dry-run | --write | --gh');
  process.exit(1);
}

const bwCheck = spawnSync('bw', ['--version'], { encoding: 'utf8' });
if (bwCheck.status !== 0) {
  console.error('Bitwarden CLI (bw) not found on PATH');
  process.exit(1);
}

if (process.env.BITWARDEN_SYNC === '1') {
  const s = bwRun(session, ['sync']);
  if (!s.ok) {
    console.error(`bw sync failed: ${s.stderr.trim() || s.stdout.trim()}`);
    process.exit(1);
  }
}

const item = resolveItem(session);
const pulled = fieldsToJson(item);

if (dryRun) {
  const keys = Object.keys(pulled).sort();
  const label = item.name ?? process.env.BITWARDEN_ITEM ?? DEFAULT_ITEM;
  console.log(`Item: ${label}`);
  console.log(
    keys.length ? `Would set JSON keys: ${keys.join(', ')}` : 'No matching custom fields found.',
  );
  process.exit(0);
}

if (write) {
  let base: Record<string, string> = {};
  if (existsSync(OUT_FILE)) {
    base = JSON.parse(readFileSync(OUT_FILE, 'utf8')) as Record<string, string>;
  }
  const merged: Record<string, string> = { ...base };
  for (const k of ALLOWED_JSON_KEYS) {
    if (pulled[k] !== undefined) merged[k] = pulled[k];
  }
  const ordered = [...ALLOWED_JSON_KEYS].sort().reduce<Record<string, string>>((acc, k) => {
    acc[k] = merged[k] ?? '';
    return acc;
  }, {});
  writeFileSync(OUT_FILE, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${Object.keys(pulled).length} keys from Bitwarden).`);
}

if (gh) {
  const ghCheck = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (ghCheck.status !== 0) {
    console.error('gh not authenticated; run gh auth login');
    process.exit(1);
  }
  for (const [jsonKey, value] of Object.entries(pulled)) {
    const secretName = JSON_TO_GH[jsonKey];
    if (!secretName) continue;
    ghSecretSet(secretName, value);
    console.log(`set GitHub secret ${secretName}`);
  }
}
