# M6 — Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render live aggregate telemetry in `/workspace#telemetry` from a tiny privacy-respecting beacon, satisfying every M6 acceptance criterion in ROADMAP.md.

**Architecture:** Replace the unbuilt `infra/workers/telemetry-{write,read}/` skeletons with two Astro API endpoints inside the site Worker (`/api/telemetry/beacon`, `/api/telemetry/stats`), matching the pattern set by `/api/contact`. The site Worker gains a `DB` binding to the existing Tofu-managed D1 database (`home-sh-telemetry`). Client beacons are sent once on `pagehide` via `navigator.sendBeacon`, gated on `navigator.doNotTrack !== '1'` and a localStorage opt-out flag. Aggregates are fetched client-side on workspace mount and rendered into the existing telemetry pane.

**Tech Stack:** Astro 6 + `@astrojs/cloudflare` v13 (site Worker), Cloudflare D1 (already provisioned by Tofu), `navigator.sendBeacon`, `PerformanceObserver` for LCP capture, `caches.default` (Cache API) for stats response caching, Bun + Playwright (smoke).

---

## Context

**Current state pre-M6** (post-v2.2.0):
- `infra/tofu/main.tf` provisions `cloudflare_d1_database.telemetry` named `home-sh-telemetry` (id `b37f9fce-9ee6-458d-9fa8-27356464788c`, exposed via `tofu output -raw d1_database_id`).
- `infra/migrations/0001_init.sql` defines `sessions` and `frame_samples` tables with appropriate indexes. **The migration has never been applied to the remote D1.**
- `infra/workers/telemetry-write/index.ts` and `infra/workers/telemetry-read/index.ts` exist as **unbuilt skeletons** — their `wrangler.jsonc` files still contain `REPLACE_WITH_D1_DATABASE_ID`, no deploy workflow runs them, and they have never been bound to a Cloudflare route.
- `apps/site/src/pages/workspace/index.astro` renders the telemetry pane with three static `<article>` blocks (search corpus / shared bridge / reading queue) — no live data.
- `apps/site/wrangler.jsonc` has `kv_namespaces`, `secrets_store_secrets`, `observability`, `unsafe.bindings` but **no `d1_databases` block**.
- `justfile` has a `migrate-remote` target pointing at the now-orphan `telemetry-write` config.
- `apps/site/src/pages/api/contact.ts` is the canonical pattern for site-Worker API endpoints (Astro `APIRoute` + `import { env } from 'cloudflare:workers'`).

**Why merge into the site Worker rather than deploy two extra workers:**
1. The two skeleton workers were never deployed. Removing them is no regression.
2. Site Worker already hosts `/api/contact`; adding `/api/telemetry/*` keeps a single ingress and a single deploy artifact (matches the M4 architectural decision to consolidate `/api/contact` into the site Worker).
3. Worker Routes for telemetry endpoints would shadow the site's Custom Domain catch-all — the merge avoids that whole layer of routing config.
4. Single D1 binding declaration in `apps/site/wrangler.jsonc` instead of two parallel ones.
5. Matches the user's stated preference for the most-mature canonical 2026 setup.

**Acceptance criteria (ROADMAP.md:460-465) and where each lands:**

| # | Criterion | Closed by |
|---|---|---|
| 1 | Read endpoint returns cached aggregate data with no raw identifiers | Task 3 (Cache API + aggregates only) |
| 2 | Write endpoint rejects malformed UUIDs and unbounded sample arrays | Task 2 (regex validation + 300-sample cap) |
| 3 | Telemetry pane explains data through labels and numbers | Task 5 (live render replacing static articles) |
| 4 | A user can block telemetry without breaking the site | Task 4 (DNT respect + opt-out flag, fail-soft on error) |

**Beacon payload (kept coarse — no PII):**

```ts
type SessionBeacon = {
  id: string;                  // UUIDv4 generated client-side once per session
  started_at: number;          // Date.now() at first /workspace render
  device_class?: 'desktop' | 'mobile' | 'tablet';
  ua_family?: string;          // Browser family string, ≤64 chars
  lcp_ms?: number;             // Largest Contentful Paint
  wasm_init_ms?: number;       // Time from script eval to canvas ready
  frame_samples?: { t: number; fps?: number; tick_rate?: number }[];
};
```

Country is derived server-side from `CF-IPCountry` (never trusts client). IP is **never** stored.

**What's NOT in this plan:**
- Site-wide telemetry — telemetry runs only on `/workspace` (the page with WASM whose perf is the actual point of measurement). Site-wide page-load metrics could be a follow-up.
- Comlink for the search Worker — covered (and skipped) under M5.
- D1 migration runbook for future schema changes — `wrangler d1 migrations apply` is idempotent; the plan documents the one-time apply for the existing `0001_init.sql` and that's all M6 needs.

**Conventions:**
- Repo root: `/home/yanai/dev/sandbox/home-sh`. All paths absolute from there.
- Commits land on a single feat branch `feat/m6-telemetry` for tasks 1–7; release flow in task 8 ships changelog roll on `chore/release-v2.3.0`.
- Each step is one action, ≤5 minutes.
- TDD where unit-test boundaries fit cleanly (Tasks 2, 3, 4); Playwright smoke for end-to-end (Task 7).

---

### Task 1: Apply D1 migration + bind D1 to site Worker

**Files:**
- Modify: `/home/yanai/dev/sandbox/home-sh/apps/site/wrangler.jsonc` (add `d1_databases` block)

**Why:** Two changes that have to land together — applying the schema to the remote D1 database, and giving the site Worker a `DB` binding so endpoints can read/write it. Without both, every subsequent task fails at runtime.

- [ ] **Step 1: Apply the migration to the remote D1 database**

```sh
cd /home/yanai/dev/sandbox/home-sh
bunx wrangler d1 migrations apply home-sh-telemetry --remote --config infra/workers/telemetry-write/wrangler.jsonc
```

Expected output: `🚣 1 command executed successfully` plus a list including `0001_init`. The `--config` flag points at the skeleton wrangler.jsonc only because that's where the `migrations_dir` mapping currently lives — it's an idempotent operation, so it's safe to use even though we're about to delete that file.

If wrangler complains that `database_id` is `REPLACE_WITH_D1_DATABASE_ID`, edit the file once locally to `b37f9fce-9ee6-458d-9fa8-27356464788c` (we're going to delete this file in Task 6 anyway — don't commit the edit yet, or edit + revert after the apply succeeds).

- [ ] **Step 2: Verify the schema is live**

```sh
bunx wrangler d1 execute home-sh-telemetry --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" --config infra/workers/telemetry-write/wrangler.jsonc
```

Expected: rows include `d1_migrations`, `frame_samples`, `sessions`. (The `d1_migrations` table is wrangler's internal tracker.)

- [ ] **Step 3: Add `d1_databases` to `apps/site/wrangler.jsonc`**

Find the `kv_namespaces` block in `apps/site/wrangler.jsonc`:

```jsonc
  "kv_namespaces": [
    {
      "binding": "SESSION",
      "id": "24a11b0f6e8d48c5b0ac070019588200"
    }
  ],
```

Insert this block immediately after it:

```jsonc
  // D1 binding for telemetry — `sessions` + `frame_samples` tables defined in
  // infra/migrations/0001_init.sql. Provisioned by Tofu (cloudflare_d1_database.telemetry).
  // Endpoints: /api/telemetry/beacon (write) and /api/telemetry/stats (read).
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "home-sh-telemetry",
      "database_id": "b37f9fce-9ee6-458d-9fa8-27356464788c",
      "migrations_dir": "../../infra/migrations"
    }
  ],
```

- [ ] **Step 4: Regenerate worker types and confirm DB binding type**

```sh
bun run --cwd apps/site wrangler-types
grep -A1 "DB:" apps/site/src/worker-configuration.d.ts | head -4
```

Expected: line `DB: D1Database;` inside the generated `Cloudflare.Env` interface.

- [ ] **Step 5: Run verify**

```sh
bun run --cwd apps/site verify
```

Expected: green (no D1-using code yet — this just confirms the binding addition didn't break anything).

- [ ] **Step 6: Commit**

```sh
git checkout -b feat/m6-telemetry
git add apps/site/wrangler.jsonc
# If you edited infra/workers/telemetry-write/wrangler.jsonc to apply the migration,
# revert that file now — it's getting deleted in Task 6:
git checkout -- infra/workers/telemetry-write/wrangler.jsonc 2>/dev/null || true
git commit -m "feat(infra): bind home-sh-telemetry D1 to site Worker"
```

---

### Task 2: Beacon endpoint as an Astro API route

**Files:**
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/beacon.ts`
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/beacon.test.ts`

**Why:** Closes ROADMAP M6 acceptance #2 (rejects malformed UUIDs and unbounded sample arrays). Handler logic mirrors the unbuilt `infra/workers/telemetry-write/index.ts` skeleton but ported to Astro `APIRoute` shape. Adds tests for each rejection branch.

- [ ] **Step 1: Write the failing tests**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/beacon.test.ts`:

```ts
import { expect, mock, test } from 'bun:test';

type StmtMock = {
  bind: ReturnType<typeof mock>;
  run: ReturnType<typeof mock>;
};

const prepared: StmtMock[] = [];
const batchCalls: unknown[][] = [];

const dbMock = {
  prepare: mock((_sql: string) => {
    const stmt: StmtMock = {
      bind: mock(() => stmt),
      run: mock(async () => ({ success: true })),
    };
    prepared.push(stmt);
    return stmt;
  }),
  batch: mock(async (statements: unknown[]) => {
    batchCalls.push(statements);
    return [];
  }),
};

mock.module('cloudflare:workers', () => ({ env: { DB: dbMock } }));

const { POST } = await import('./beacon');

function buildRequest(body: unknown): Request {
  return new Request('https://yanai.sh/api/telemetry/beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-IPCountry': 'US' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('rejects malformed UUID', async () => {
  // @ts-expect-error — Astro APIRoute signature
  const res = await POST({ request: buildRequest({ id: 'not-a-uuid', started_at: Date.now() }) });
  expect(res.status).toBe(400);
});

test('rejects missing started_at', async () => {
  // @ts-expect-error
  const res = await POST({
    request: buildRequest({ id: '11111111-1111-4111-8111-111111111111' }),
  });
  expect(res.status).toBe(400);
});

test('rejects invalid JSON', async () => {
  // @ts-expect-error
  const res = await POST({ request: buildRequest('not json') });
  expect(res.status).toBe(400);
});

test('caps frame_samples at 300', async () => {
  prepared.length = 0;
  batchCalls.length = 0;
  const samples = Array.from({ length: 1000 }, (_, i) => ({ t: i, fps: 60 }));
  // @ts-expect-error
  const res = await POST({
    request: buildRequest({
      id: '22222222-2222-4222-8222-222222222222',
      started_at: Date.now(),
      frame_samples: samples,
    }),
  });
  expect(res.status).toBe(200);
  // One batch call; the bound statements length is capped at 300.
  expect(batchCalls.length).toBe(1);
  expect(batchCalls[0]).toHaveLength(300);
});

test('accepts a clean beacon and returns ok:true', async () => {
  prepared.length = 0;
  batchCalls.length = 0;
  // @ts-expect-error
  const res = await POST({
    request: buildRequest({
      id: '33333333-3333-4333-8333-333333333333',
      started_at: Date.now(),
      device_class: 'desktop',
      ua_family: 'firefox',
      lcp_ms: 1200,
      wasm_init_ms: 240,
      frame_samples: [{ t: 1, fps: 58 }],
    }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok?: boolean };
  expect(body.ok).toBe(true);
});

test('rejects non-POST methods', async () => {
  const req = new Request('https://yanai.sh/api/telemetry/beacon', { method: 'GET' });
  // @ts-expect-error
  const res = await (await import('./beacon')).GET?.({ request: req }) ??
    new Response(null, { status: 405 });
  // The Astro route only exports POST; verify GET isn't reachable as a side effect.
  expect(typeof (await import('./beacon')).GET).toBe('undefined');
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

```sh
bun test apps/site/src/pages/api/telemetry/beacon.test.ts
```

Expected: FAIL — `Cannot find module './beacon'`.

- [ ] **Step 3: Create the beacon endpoint**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/beacon.ts`:

```ts
// POST /api/telemetry/beacon — receives a single coarse session beacon and
// inserts it into the home-sh-telemetry D1 database. Validates client-supplied
// UUIDv4 and caps `frame_samples` at 300 entries to defend against unbounded
// arrays. Country comes from the Cloudflare edge (`CF-IPCountry` header), never
// from the client. IPs are not stored.

import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

interface FrameSample {
  t: number;
  fps?: number;
  tick_rate?: number;
}

interface SessionBeacon {
  id: string;
  started_at: number;
  device_class?: string;
  ua_family?: string;
  lcp_ms?: number;
  wasm_init_ms?: number;
  frame_samples?: FrameSample[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_DEVICE_CLASSES = new Set(['desktop', 'mobile', 'tablet']);
const FRAME_SAMPLE_CAP = 300;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let beacon: SessionBeacon;
  try {
    beacon = (await request.json()) as SessionBeacon;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (
    typeof beacon.id !== 'string' ||
    !UUID_RE.test(beacon.id) ||
    typeof beacon.started_at !== 'number' ||
    !Number.isFinite(beacon.started_at)
  ) {
    return json({ error: 'invalid_beacon' }, 400);
  }

  const country = request.headers.get('CF-IPCountry') ?? null;
  const deviceClass = VALID_DEVICE_CLASSES.has(beacon.device_class ?? '')
    ? beacon.device_class!
    : null;
  const uaFamily = typeof beacon.ua_family === 'string' ? beacon.ua_family.slice(0, 64) : null;
  const lcpMs = Number.isFinite(beacon.lcp_ms) ? beacon.lcp_ms! : null;
  const wasmInitMs = Number.isFinite(beacon.wasm_init_ms) ? beacon.wasm_init_ms! : null;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO sessions (id, started_at, country, device_class, ua_family, lcp_ms, wasm_init_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(beacon.id, beacon.started_at, country, deviceClass, uaFamily, lcpMs, wasmInitMs)
    .run();

  if (Array.isArray(beacon.frame_samples) && beacon.frame_samples.length > 0) {
    const samples = beacon.frame_samples.slice(0, FRAME_SAMPLE_CAP);
    const valid = samples.filter((s): s is FrameSample => Number.isFinite(s?.t));
    if (valid.length > 0) {
      const stmt = env.DB.prepare(
        `INSERT INTO frame_samples (session_id, t, fps, tick_rate) VALUES (?, ?, ?, ?)`,
      );
      await env.DB.batch(
        valid.map((s) => stmt.bind(beacon.id, s.t, s.fps ?? null, s.tick_rate ?? null)),
      );
    }
  }

  return json({ ok: true });
};
```

- [ ] **Step 4: Run tests, confirm they pass**

```sh
bun test apps/site/src/pages/api/telemetry/beacon.test.ts
```

Expected: 6 pass.

- [ ] **Step 5: Verify**

```sh
bun run --cwd apps/site verify
```

Expected: green.

- [ ] **Step 6: Commit**

```sh
git add apps/site/src/pages/api/telemetry/beacon.ts apps/site/src/pages/api/telemetry/beacon.test.ts
git commit -m "feat(telemetry): /api/telemetry/beacon endpoint with UUID + sample-cap defense"
```

---

### Task 3: Stats endpoint as an Astro API route

**Files:**
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/stats.ts`
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/stats.test.ts`

**Why:** Closes ROADMAP M6 acceptance #1 (cached aggregate, no raw identifiers). Handler logic mirrors the unbuilt `infra/workers/telemetry-read/index.ts` skeleton ported to Astro. Cache API is preserved (60s fresh + 120s stale-while-revalidate).

- [ ] **Step 1: Write the failing tests**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/stats.test.ts`:

```ts
import { expect, mock, test } from 'bun:test';

const dbMock = {
  batch: mock(async () => [
    { results: [{ n: 42 }] },
    { results: [{ n: 17 }] },
    { results: [{ v: 1234 }] },
    { results: [{ v: 58.5 }] },
    { results: [{ country: 'US', count: 10 }, { country: 'IL', count: 5 }] },
    { results: [{ device_class: 'desktop', count: 30 }, { device_class: 'mobile', count: 12 }] },
  ]),
};

mock.module('cloudflare:workers', () => ({ env: { DB: dbMock } }));

const { GET } = await import('./stats');

test('returns aggregate JSON shape with all expected keys', async () => {
  const ctx = {
    request: new Request('https://yanai.sh/api/telemetry/stats'),
    waitUntil: () => undefined,
  };
  // @ts-expect-error — Astro APIContext shape; we exercise GET directly.
  const res = await GET(ctx);
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(
    ['avg_fps', 'avg_lcp_ms', 'device_breakdown', 'sessions_last_30d', 'top_countries', 'total_sessions'],
  );
  expect(body.total_sessions).toBe(42);
  expect(body.sessions_last_30d).toBe(17);
});

test('response carries cache + CORS headers', async () => {
  const ctx = {
    request: new Request('https://yanai.sh/api/telemetry/stats'),
    waitUntil: () => undefined,
  };
  // @ts-expect-error
  const res = await GET(ctx);
  expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  expect(res.headers.get('Cache-Control')).toContain('stale-while-revalidate=120');
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://yanai.sh');
});

test('aggregate response carries no session-id field', async () => {
  const ctx = {
    request: new Request('https://yanai.sh/api/telemetry/stats'),
    waitUntil: () => undefined,
  };
  // @ts-expect-error
  const res = await GET(ctx);
  const body = (await res.json()) as Record<string, unknown>;
  // Acceptance criterion: "no raw identifiers" — id is forbidden in any form.
  expect(JSON.stringify(body)).not.toContain('id');
});
```

- [ ] **Step 2: Run the tests, confirm failure**

```sh
bun test apps/site/src/pages/api/telemetry/stats.test.ts
```

Expected: FAIL — `Cannot find module './stats'`.

- [ ] **Step 3: Create the stats endpoint**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/api/telemetry/stats.ts`:

```ts
// GET /api/telemetry/stats — aggregate counters + averages over the
// home-sh-telemetry D1 database. Response is cached at the edge for 60s with
// 120s stale-while-revalidate; no per-session identifiers are emitted.

import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

interface CountryRow {
  country: string;
  count: number;
}
interface DeviceRow {
  device_class: string;
  count: number;
}
interface ScalarRow {
  n: number;
}
interface AvgRow {
  v: number | null;
}

interface Stats {
  total_sessions: number;
  sessions_last_30d: number;
  avg_lcp_ms: number | null;
  avg_fps: number | null;
  top_countries: CountryRow[];
  device_breakdown: DeviceRow[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': 'https://yanai.sh',
    },
  });

export const GET: APIRoute = async ({ request }) => {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/telemetry/stats', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const [total, recent, avgLcp, avgFps, countries, devices] = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM sessions`),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE started_at >= ?`).bind(cutoff),
    env.DB.prepare(`SELECT AVG(lcp_ms) AS v FROM sessions WHERE lcp_ms IS NOT NULL`),
    env.DB.prepare(`SELECT AVG(fps) AS v FROM frame_samples WHERE fps IS NOT NULL`),
    env.DB.prepare(
      `SELECT country, COUNT(*) AS count FROM sessions
       WHERE country IS NOT NULL AND country != 'XX'
       GROUP BY country ORDER BY count DESC LIMIT 10`,
    ),
    env.DB.prepare(
      `SELECT device_class, COUNT(*) AS count FROM sessions
       WHERE device_class IS NOT NULL GROUP BY device_class ORDER BY count DESC`,
    ),
  ]);

  const stats: Stats = {
    total_sessions: (total.results[0] as ScalarRow)?.n ?? 0,
    sessions_last_30d: (recent.results[0] as ScalarRow)?.n ?? 0,
    avg_lcp_ms: (avgLcp.results[0] as AvgRow)?.v ?? null,
    avg_fps: (avgFps.results[0] as AvgRow)?.v ?? null,
    top_countries: countries.results as CountryRow[],
    device_breakdown: devices.results as DeviceRow[],
  };

  const response = jsonResponse(stats);
  // Cache.put consumes the body, so clone before returning.
  // (Astro endpoints don't expose ExecutionContext.waitUntil — we await the put
  // synchronously; on cache backends this is sub-ms, well under the 60s budget.)
  await cache.put(cacheKey, response.clone());
  return response;
};
```

> Note on `waitUntil`: the original skeleton used `ctx.waitUntil(cache.put(...))` to fire-and-forget. Astro's `APIRoute` signature doesn't surface `ExecutionContext`, so we `await` the put inline. D1's edge cache is local to the colo and writes complete in single-digit ms — the small latency cost is worth not depending on Astro internals. If this ever becomes hot, we can swap to a Worker entrypoint.

- [ ] **Step 4: Run the tests, confirm pass**

```sh
bun test apps/site/src/pages/api/telemetry/stats.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Verify**

```sh
bun run --cwd apps/site verify
```

Expected: green.

- [ ] **Step 6: Commit**

```sh
git add apps/site/src/pages/api/telemetry/stats.ts apps/site/src/pages/api/telemetry/stats.test.ts
git commit -m "feat(telemetry): /api/telemetry/stats endpoint with edge cache + aggregates"
```

---

### Task 4: Client telemetry library + DNT gating

**Files:**
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-client.ts`
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-client.test.ts`

**Why:** Closes ROADMAP M6 acceptance #4 (user can block telemetry). Generates a session UUID, captures LCP via `PerformanceObserver`, listens for the `telemetry:wasm-ready` custom event for `wasm_init_ms`, samples fps via rAF, and sends one beacon on `pagehide`. Honors `navigator.doNotTrack === '1'` and a `localStorage['telemetry:opt-out'] === '1'` flag.

- [ ] **Step 1: Write the failing tests**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-client.test.ts`:

```ts
import { expect, mock, test } from 'bun:test';
import { isTelemetryAllowed, randomUuidV4, deviceClass } from './telemetry-client';

test('randomUuidV4 returns a valid UUIDv4 string', () => {
  for (let i = 0; i < 50; i += 1) {
    const id = randomUuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});

test('isTelemetryAllowed returns false when navigator.doNotTrack is "1"', () => {
  const result = isTelemetryAllowed({
    doNotTrack: '1',
    optOut: false,
  });
  expect(result).toBe(false);
});

test('isTelemetryAllowed returns false when optOut flag is set', () => {
  const result = isTelemetryAllowed({
    doNotTrack: null,
    optOut: true,
  });
  expect(result).toBe(false);
});

test('isTelemetryAllowed returns true when neither signal is set', () => {
  const result = isTelemetryAllowed({
    doNotTrack: null,
    optOut: false,
  });
  expect(result).toBe(true);
});

test('isTelemetryAllowed treats "yes" doNotTrack value as opt-out (older Firefox)', () => {
  const result = isTelemetryAllowed({
    doNotTrack: 'yes',
    optOut: false,
  });
  expect(result).toBe(false);
});

test('deviceClass returns "mobile" / "desktop" / "tablet" for typical UA strings', () => {
  expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
  expect(deviceClass('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
  expect(deviceClass('Mozilla/5.0 (X11; Linux x86_64)')).toBe('desktop');
  expect(deviceClass('Mozilla/5.0 (Android 14; Mobile)')).toBe('mobile');
  expect(deviceClass('Mozilla/5.0 (Android 14; Tablet)')).toBe('tablet');
});
```

- [ ] **Step 2: Run, confirm failure**

```sh
bun test apps/site/src/lib/telemetry-client.test.ts
```

Expected: FAIL — `Cannot find module './telemetry-client'`.

- [ ] **Step 3: Create the client library**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-client.ts`:

```ts
// Workspace telemetry — generates a per-session beacon, captures LCP / WASM
// init / frame samples, and posts to /api/telemetry/beacon once on `pagehide`
// (or `visibilitychange` to "hidden" as a safety net for Safari mobile).
//
// Privacy posture:
// - One UUIDv4 generated per page-session (sessionStorage). No fingerprinting.
// - Country comes from the Cloudflare edge header server-side, not the client.
// - `navigator.doNotTrack === '1'` (or the legacy "yes") suppresses sending.
// - `localStorage['telemetry:opt-out'] === '1'` also suppresses sending.
// - Failure to deliver is silent; nothing else on the page depends on this.

interface FrameSample {
  t: number;
  fps?: number;
  tick_rate?: number;
}

interface SessionBeacon {
  id: string;
  started_at: number;
  device_class?: 'desktop' | 'mobile' | 'tablet';
  ua_family?: string;
  lcp_ms?: number;
  wasm_init_ms?: number;
  frame_samples?: FrameSample[];
}

const BEACON_PATH = '/api/telemetry/beacon';
const FRAME_SAMPLE_INTERVAL_MS = 5_000;
const FRAME_SAMPLE_CAP = 60; // 5 min @ 1 sample / 5s, well under server cap of 300

export function randomUuidV4(): string {
  // crypto.randomUUID is available in every browser this site supports
  // (Cloudflare's COOP/COEP gate already excludes ancient ones from /workspace).
  return crypto.randomUUID();
}

export function isTelemetryAllowed(signals: {
  doNotTrack: string | null;
  optOut: boolean;
}): boolean {
  if (signals.optOut) return false;
  if (signals.doNotTrack === '1' || signals.doNotTrack === 'yes') return false;
  return true;
}

export function deviceClass(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/iPad|Android(?!.*Mobile).*Tablet/i.test(ua)) return 'tablet';
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function uaFamily(ua: string): string {
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

export interface TelemetryHandle {
  /** Force-send the beacon now (e.g. for tests). Returns true if sent. */
  flush(): boolean;
}

export function mountTelemetry(): TelemetryHandle | null {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return null;

  const allowed = isTelemetryAllowed({
    doNotTrack: navigator.doNotTrack,
    optOut: (() => {
      try {
        return localStorage.getItem('telemetry:opt-out') === '1';
      } catch {
        return false;
      }
    })(),
  });
  if (!allowed) return null;

  const beacon: SessionBeacon = {
    id: randomUuidV4(),
    started_at: Date.now(),
    device_class: deviceClass(navigator.userAgent),
    ua_family: uaFamily(navigator.userAgent),
    frame_samples: [],
  };

  // LCP — keep the latest candidate value.
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) beacon.lcp_ms = Math.round(last.startTime);
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // PerformanceObserver may not support this entry type — leave lcp_ms undefined.
  }

  // WASM init — workspace-wip-client.ts dispatches this once canvas is ready.
  window.addEventListener(
    'telemetry:wasm-ready',
    (event) => {
      const detail = (event as CustomEvent<{ ms: number }>).detail;
      if (detail && Number.isFinite(detail.ms)) beacon.wasm_init_ms = Math.round(detail.ms);
    },
    { once: true },
  );

  // Frame sampling — count rAF callbacks per interval, emit fps every 5s.
  let frames = 0;
  let lastSampleAt = performance.now();
  const tick = () => {
    frames += 1;
    const now = performance.now();
    if (now - lastSampleAt >= FRAME_SAMPLE_INTERVAL_MS) {
      const fps = Math.round((frames * 1000) / (now - lastSampleAt));
      if (beacon.frame_samples!.length < FRAME_SAMPLE_CAP) {
        beacon.frame_samples!.push({ t: Math.round(Date.now()), fps });
      }
      frames = 0;
      lastSampleAt = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let sent = false;
  const send = (): boolean => {
    if (sent) return false;
    sent = true;
    try {
      // sendBeacon is the canonical "send on pagehide" primitive — survives
      // navigation away even when the document is being torn down.
      const ok = navigator.sendBeacon(
        BEACON_PATH,
        new Blob([JSON.stringify(beacon)], { type: 'application/json' }),
      );
      return ok;
    } catch {
      return false;
    }
  };

  // Cover both the standard pagehide event AND visibility→hidden, since some
  // mobile browsers (notably iOS Safari) skip pagehide when the user
  // backgrounds the tab.
  window.addEventListener('pagehide', send, { once: false });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });

  return { flush: send };
}
```

- [ ] **Step 4: Run tests, confirm pass**

```sh
bun test apps/site/src/lib/telemetry-client.test.ts
```

Expected: 6 pass.

- [ ] **Step 5: Verify**

```sh
bun run --cwd apps/site verify
```

Expected: green.

- [ ] **Step 6: Commit**

```sh
git add apps/site/src/lib/telemetry-client.ts apps/site/src/lib/telemetry-client.test.ts
git commit -m "feat(telemetry): client beacon library with DNT + opt-out gating"
```

---

### Task 5: Wire client into workspace + live pane numbers

**Files:**
- Modify: `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/workspace-wip-client.ts` (dispatch `telemetry:wasm-ready` after canvas first-paint succeeds)
- Modify: `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/workspace/index.astro` (add `data-telemetry-stat` slots inside the telemetry pane, swap article content; add `<script>` that mounts telemetry and fetches stats)
- Create: `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-stats-client.ts`

**Why:** Closes ROADMAP M6 acceptance #3 (telemetry pane explains data through labels and numbers). Three telemetry pane articles get live aggregate numbers; the wasm-init timing closes the loop on Task 4.

- [ ] **Step 1: Dispatch `telemetry:wasm-ready` from `mountCanvas`**

In `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/workspace-wip-client.ts`, find the inside of `mountCanvas` where the WASM module is awaited. Locate this block:

```ts
  let mod: CanvasModule;
  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', globalThis.location.href).href;
    mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as CanvasModule;
    await mod.default();
    setStatus(targets.wasm, 'ready');
  } catch (error) {
    console.error('canvas: WASM load failed', error);
    setStatus(targets.wasm, 'error');
    setStatus(targets.canvas, 'error');
    return;
  }
```

Replace with:

```ts
  const wasmStart = performance.now();
  let mod: CanvasModule;
  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', globalThis.location.href).href;
    mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as CanvasModule;
    await mod.default();
    setStatus(targets.wasm, 'ready');
    // Telemetry hook: fires once per page-session. The telemetry-client picks
    // it up to populate `wasm_init_ms` in the outgoing beacon.
    window.dispatchEvent(
      new CustomEvent('telemetry:wasm-ready', { detail: { ms: performance.now() - wasmStart } }),
    );
  } catch (error) {
    console.error('canvas: WASM load failed', error);
    setStatus(targets.wasm, 'error');
    setStatus(targets.canvas, 'error');
    return;
  }
```

Two changes: capture `wasmStart` before the import, and dispatch the custom event after `setStatus(targets.wasm, 'ready')`.

- [ ] **Step 2: Create the stats fetcher**

Create `/home/yanai/dev/sandbox/home-sh/apps/site/src/lib/telemetry-stats-client.ts`:

```ts
// Fetches /api/telemetry/stats and fills `[data-telemetry-stat]` slots in the
// telemetry pane. Fail-soft: on error, slots stay at their SSR'd default text.

interface CountryRow {
  country: string;
  count: number;
}
interface DeviceRow {
  device_class: string;
  count: number;
}
interface Stats {
  total_sessions: number;
  sessions_last_30d: number;
  avg_lcp_ms: number | null;
  avg_fps: number | null;
  top_countries: CountryRow[];
  device_breakdown: DeviceRow[];
}

function fmt(value: number | null, suffix = ''): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return `${rounded}${suffix}`;
}

function setSlot(name: string, value: string): void {
  const el = document.querySelector<HTMLElement>(`[data-telemetry-stat="${name}"]`);
  if (el) el.textContent = value;
}

export async function mountTelemetryStats(): Promise<void> {
  let stats: Stats;
  try {
    const res = await fetch('/api/telemetry/stats', { credentials: 'omit' });
    if (!res.ok) return;
    stats = (await res.json()) as Stats;
  } catch {
    return;
  }

  setSlot('total-sessions', fmt(stats.total_sessions));
  setSlot('sessions-30d', fmt(stats.sessions_last_30d));
  setSlot('avg-lcp', fmt(stats.avg_lcp_ms, ' ms'));
  setSlot('avg-fps', fmt(stats.avg_fps, ' fps'));

  const countries = stats.top_countries
    .slice(0, 5)
    .map((row) => `${row.country} (${row.count})`)
    .join(' · ');
  if (countries) setSlot('countries', countries);

  const devices = stats.device_breakdown
    .map((row) => `${row.device_class} (${row.count})`)
    .join(' · ');
  if (devices) setSlot('devices', devices);
}
```

- [ ] **Step 3: Replace the telemetry pane articles**

In `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/workspace/index.astro`, find the existing telemetry pane content:

```astro
        <section class="pane" id="telemetry" data-pane aria-labelledby="telemetry-title">
          <p class="pane-kicker">telemetry</p>
          <h2 id="telemetry-title" tabindex="-1">local runtime proof</h2>
          <div class="telemetry-grid">
            <article>
              <h3>search corpus</h3>
              <p>Workspace, resume, stack, uses, and project entries are indexed by Rust WASM.</p>
            </article>
            <article>
              <h3>shared bridge</h3>
              <p>SharedArrayBuffer is scoped to `/workspace` through COOP/COEP headers.</p>
            </article>
            <article>
              <h3>reading queue</h3>
              <ul>
                {READING.map((item) => (
                  <li>{item.title} / {item.status}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
```

Replace with:

```astro
        <section class="pane" id="telemetry" data-pane aria-labelledby="telemetry-title">
          <p class="pane-kicker">telemetry</p>
          <h2 id="telemetry-title" tabindex="-1">local runtime proof</h2>
          <p class="pane-summary">
            Aggregate runtime data from /workspace visits over the last 30 days.
            No identifiers, no ad networks; the page works the same with telemetry
            blocked (DNT or <code>localStorage['telemetry:opt-out']='1'</code>).
          </p>
          <div class="telemetry-grid">
            <article>
              <h3>sessions</h3>
              <p>
                <strong data-telemetry-stat="total-sessions">—</strong>
                total ·
                <strong data-telemetry-stat="sessions-30d">—</strong>
                in last 30 days
              </p>
            </article>
            <article>
              <h3>performance</h3>
              <p>
                LCP <strong data-telemetry-stat="avg-lcp">—</strong> ·
                avg fps <strong data-telemetry-stat="avg-fps">—</strong>
              </p>
            </article>
            <article>
              <h3>geography &amp; device</h3>
              <p>
                <strong data-telemetry-stat="countries">—</strong>
              </p>
              <p>
                <strong data-telemetry-stat="devices">—</strong>
              </p>
            </article>
          </div>
        </section>
```

The `—` text is the SSR'd default; `mountTelemetryStats()` fills it client-side. Failure leaves the dashes in place (fail-soft).

- [ ] **Step 4: Update the workspace `<script>` block to mount both telemetry helpers**

In `/home/yanai/dev/sandbox/home-sh/apps/site/src/pages/workspace/index.astro`, find the existing `<script>` block at the bottom:

```astro
<script>
  import { mountWorkspaceWip } from "@lib/workspace-wip-client";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountWorkspaceWip, { once: true });
  } else {
    mountWorkspaceWip();
  }
</script>
```

Replace with:

```astro
<script>
  import { mountWorkspaceWip } from "@lib/workspace-wip-client";
  import { mountTelemetry } from "@lib/telemetry-client";
  import { mountTelemetryStats } from "@lib/telemetry-stats-client";

  function bootWorkspace() {
    mountWorkspaceWip();
    mountTelemetry();
    void mountTelemetryStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWorkspace, { once: true });
  } else {
    bootWorkspace();
  }
</script>
```

- [ ] **Step 5: Verify**

```sh
bun run --cwd apps/site verify
```

Expected: green.

- [ ] **Step 6: Manual probe**

```sh
eval "$(SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt sops --decrypt --input-type json --output-type json infra/tofu/secrets.enc.json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value)"')"
bun run --cwd apps/site preview &
sleep 4
# Visit http://127.0.0.1:4321/workspace#telemetry. The pane should render with
# `—` placeholders (preview server has no D1 binding; the fetch fails fast).
# Open DevTools → Network and confirm `/api/telemetry/stats` is requested and
# returns either 200 with cached aggregates (against deployed Worker) or 500
# (against preview, which has no DB binding) — either way the pane stays
# readable, no console errors block rendering.
pkill -f 'astro preview'
```

> If `astro preview` crashes the stats endpoint with `env.DB is undefined`, that's expected for the preview server (no Cloudflare bindings). The endpoint will work against the deployed Worker; the pane is fail-soft so this won't break local dev.

- [ ] **Step 7: Commit**

```sh
git add apps/site/src/lib/workspace-wip-client.ts apps/site/src/lib/telemetry-stats-client.ts apps/site/src/pages/workspace/index.astro
git commit -m "feat(telemetry): live aggregates in workspace pane + wasm-ready hook"
```

---

### Task 6: Drop skeleton telemetry workers + update justfile

**Files:**
- Delete: `/home/yanai/dev/sandbox/home-sh/infra/workers/telemetry-write/` (entire directory)
- Delete: `/home/yanai/dev/sandbox/home-sh/infra/workers/telemetry-read/` (entire directory)
- Modify: `/home/yanai/dev/sandbox/home-sh/justfile` (point `migrate-remote` at the site Worker config)

**Why:** The two skeleton dirs were deliberately created earlier as scaffolding for a separate-Workers architecture. Tasks 1–5 made them obsolete: the same logic now lives in the site Worker, the same D1 binding is declared in `apps/site/wrangler.jsonc`, and migrations apply against that config. Leaving the skeletons would create three confusion vectors: (a) someone might wire a deploy to them, (b) `wrangler types` regenerations might collide, (c) the README/ARCHITECTURE references would point at unmaintained code.

- [ ] **Step 1: Verify nothing else still references the skeleton dirs**

```sh
cd /home/yanai/dev/sandbox/home-sh
grep -rn "infra/workers/telemetry-" --include='*.{md,yml,yaml,jsonc,json,ts,tf}' --exclude-dir=node_modules .
```

Expected: only matches in the docs (CHANGELOG, ARCHITECTURE, README), the justfile, and the soon-to-be-deleted skeleton files themselves. Note any docs that need updating.

- [ ] **Step 2: Delete the skeleton dirs**

```sh
git rm -r infra/workers/telemetry-write infra/workers/telemetry-read
```

If `infra/workers/` is now empty, also remove it:

```sh
test -z "$(ls -A infra/workers 2>/dev/null)" && rmdir infra/workers && echo "removed empty infra/workers/"
```

- [ ] **Step 3: Update the justfile `migrate-remote` target**

In `/home/yanai/dev/sandbox/home-sh/justfile`, find:

```just
# Run D1 migrations against remote database (production — use carefully)
migrate-remote:
    wrangler d1 migrations apply home-sh-telemetry --config infra/workers/telemetry-write/wrangler.jsonc
```

Replace with:

```just
# Run D1 migrations against remote database (production — use carefully)
migrate-remote:
    cd apps/site && wrangler d1 migrations apply home-sh-telemetry --remote
```

- [ ] **Step 4: Update the `worker-types` justfile target if it references the deleted dirs**

Read `/home/yanai/dev/sandbox/home-sh/justfile` and check for any `wrangler types` invocations against `infra/workers/telemetry-{read,write}/`. If found, remove those two lines (the site Worker's types are regenerated by the existing `bun run --cwd apps/site wrangler-types` already).

If the existing target reads:

```just
worker-types:
    wrangler types --config infra/workers/telemetry-write/wrangler.jsonc --output-path infra/workers/telemetry-write/worker-configuration.d.ts
    wrangler types --config infra/workers/telemetry-read/wrangler.jsonc  --output-path infra/workers/telemetry-read/worker-configuration.d.ts
```

Replace with:

```just
worker-types:
    cd apps/site && bun run wrangler-types
```

If the target doesn't exist or doesn't reference these dirs, no edit needed.

- [ ] **Step 5: Update ARCHITECTURE.md / README if either documents the dual-Worker telemetry split**

```sh
grep -n "telemetry-write\|telemetry-read\|two telemetry" ARCHITECTURE.md README.md 2>&1 || echo "no doc references"
```

If ARCHITECTURE.md describes "telemetry-write Worker" or "telemetry-read Worker" as separate deploy artifacts, replace those references with a single sentence: "Telemetry endpoints (`/api/telemetry/beacon` and `/api/telemetry/stats`) live in the site Worker alongside `/api/contact`, bound to the `home-sh-telemetry` D1 database via the `DB` binding declared in `apps/site/wrangler.jsonc`."

If no such references exist, skip.

- [ ] **Step 6: Verify**

```sh
bun run --cwd apps/site verify
just --list >/dev/null
```

Expected: verify green; `just --list` runs without errors (i.e. justfile is syntactically valid after edits).

- [ ] **Step 7: Commit**

```sh
git add -A
git status --short
# Expected: D infra/workers/telemetry-{read,write}/* ; M justfile ; possibly M ARCHITECTURE.md or README.md
git commit -m "chore(telemetry): drop unbuilt /infra/workers/telemetry-{read,write} skeletons"
```

---

### Task 7: Workspace smoke spec additions

**Files:**
- Modify: `/home/yanai/dev/sandbox/home-sh/apps/site/tests/smoke/workspace.spec.ts`

**Why:** Locks the four M6 acceptance gates as automated regression — read endpoint shape, write endpoint defenses, pane labels/numbers visible, and DNT-suppression.

- [ ] **Step 1: Add the new test cases**

In `/home/yanai/dev/sandbox/home-sh/apps/site/tests/smoke/workspace.spec.ts`, append at the end of the file (after the existing mobile-viewport test):

```ts
test('telemetry pane renders aggregate stat slots', async ({ page }) => {
  await page.goto(`${BASE}/workspace#telemetry`);
  // Each `data-telemetry-stat` slot is server-rendered as `—` and overwritten
  // (or left as `—`) by the client fetch. The slot existence is what the
  // acceptance gate cares about — labels + numbers, not specific values.
  for (const name of ['total-sessions', 'sessions-30d', 'avg-lcp', 'avg-fps', 'countries', 'devices']) {
    await expect(page.locator(`[data-telemetry-stat="${name}"]`)).toBeAttached();
  }
});

test('beacon endpoint rejects malformed UUID', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'beacon endpoint requires deployed Worker (D1 binding)');
  const res = await request.post(`${BASE}/api/telemetry/beacon`, {
    data: { id: 'not-a-uuid', started_at: Date.now() },
  });
  expect(res.status()).toBe(400);
});

test('beacon endpoint accepts oversized frame_samples without erroring', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'beacon endpoint requires deployed Worker (D1 binding)');
  const samples = Array.from({ length: 1000 }, (_, i) => ({ t: i, fps: 60 }));
  const res = await request.post(`${BASE}/api/telemetry/beacon`, {
    data: {
      id: '44444444-4444-4444-8444-444444444444',
      started_at: Date.now(),
      frame_samples: samples,
    },
  });
  // 200 — server caps at 300, doesn't fail the request.
  expect(res.status()).toBe(200);
});

test('stats endpoint returns expected aggregate shape', async ({ request }) => {
  test.skip(!process.env.SMOKE_BASE_URL, 'stats endpoint requires deployed Worker (D1 binding)');
  const res = await request.get(`${BASE}/api/telemetry/stats`);
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('max-age=60');
  const body = await res.json();
  for (const key of ['total_sessions', 'sessions_last_30d', 'avg_lcp_ms', 'avg_fps', 'top_countries', 'device_breakdown']) {
    expect(body).toHaveProperty(key);
  }
  // No raw identifiers leak into the aggregate.
  expect(JSON.stringify(body)).not.toMatch(/\bid\b/);
});

test('DNT user does not POST a beacon', async ({ browser }) => {
  // Playwright launches contexts with DNT off by default; explicitly enable.
  const ctx = await browser.newContext({
    extraHTTPHeaders: {},
    // Spoof navigator.doNotTrack via init script so the client-side gate trips.
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'doNotTrack', {
      configurable: true,
      get: () => '1',
    });
  });
  let beaconRequests = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/telemetry/beacon')) beaconRequests += 1;
  });
  await page.goto(`${BASE}/workspace`);
  // Trigger the pagehide path by navigating away.
  await page.goto(`${BASE}/`);
  // Wait a short beat for any racing sendBeacon.
  await page.waitForTimeout(500);
  expect(beaconRequests).toBe(0);
  await ctx.close();
});
```

- [ ] **Step 2: Run the smoke suite locally**

```sh
eval "$(SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt sops --decrypt --input-type json --output-type json infra/tofu/secrets.enc.json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value)"')"
bun run --cwd apps/site build
bun run --cwd apps/site smoke
```

Expected: the new "telemetry pane renders aggregate stat slots" and "DNT user does not POST a beacon" tests pass against the preview server. The three deployed-only tests (beacon UUID rejection, oversized samples, stats shape) skip without `SMOKE_BASE_URL`.

- [ ] **Step 3: Commit**

```sh
git add apps/site/tests/smoke/workspace.spec.ts
git commit -m "test(smoke): cover M6 acceptance gates (beacon, stats, pane, DNT)"
```

---

### Task 8: PR + tag v2.3.0

**Files:**
- Modify: `/home/yanai/dev/sandbox/home-sh/CHANGELOG.md` (roll `[Unreleased]` → `[2.3.0]`)

- [ ] **Step 1: Push the feat branch + open PR**

```sh
git push -u origin feat/m6-telemetry
gh pr create --title "feat(telemetry): M6 — live workspace aggregates" --body "Closes M6 acceptance criteria from ROADMAP.md. See docs/superpowers/plans/2026-05-06-m6-telemetry.md for the full breakdown."
```

- [ ] **Step 2: Wait for CI green, then merge**

```sh
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 3: Watch the deploy run**

```sh
gh run list -L 1 --workflow=Deploy
gh run watch <run-id> --exit-status
```

Expected: success. The site Worker now binds D1.

- [ ] **Step 4: Run prod smoke**

```sh
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
```

Expected: every test passes, including the three M6 deployed-only cases (`beacon endpoint rejects malformed UUID`, `beacon endpoint accepts oversized frame_samples`, `stats endpoint returns expected aggregate shape`).

- [ ] **Step 5: Manual probe — submit a real beacon, then confirm stats reflect it**

```sh
# Generate a UUID and POST it.
UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
curl -sS -X POST https://yanai.sh/api/telemetry/beacon \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg id "$UUID" --argjson now $(date +%s%3N) '{id:$id, started_at:$now, device_class:"desktop", ua_family:"firefox", lcp_ms:1100, wasm_init_ms:230}')"
# Expected: {"ok":true}

# Wait for cache TTL to roll (60s) then fetch stats.
sleep 65
curl -sS https://yanai.sh/api/telemetry/stats | jq '{total_sessions, sessions_last_30d}'
# Expected: total_sessions ≥ 1, sessions_last_30d ≥ 1.
```

- [ ] **Step 6: Roll the changelog on a chore branch**

```sh
git checkout -b chore/release-v2.3.0
```

In `/home/yanai/dev/sandbox/home-sh/CHANGELOG.md`, find:

```markdown
## [Unreleased]

## [2.2.0] - 2026-05-06
```

Replace with:

```markdown
## [Unreleased]

## [2.3.0] - 2026-05-06

### Added

- **Telemetry (M6)** — live aggregate counters in `/workspace#telemetry`: total sessions, sessions in last 30 days, average LCP, average FPS from frame samples, top-10 countries (from CF-IPCountry, never client IP), and device-class breakdown. Beacon (`POST /api/telemetry/beacon`) lives in the site Worker alongside `/api/contact`, bound to the Tofu-managed `home-sh-telemetry` D1 database. Stats endpoint (`GET /api/telemetry/stats`) caches at the edge for 60s with 120s stale-while-revalidate. Client respects `navigator.doNotTrack === '1'` (and the legacy `'yes'`) plus a `localStorage['telemetry:opt-out'] = '1'` flag — both suppress the beacon entirely.

### Removed

- **Skeleton telemetry workers** at `infra/workers/telemetry-{read,write}/` — never deployed; logic merged into the site Worker as Astro API routes for a single ingress and one deploy artifact.

## [2.2.0] - 2026-05-06
```

- [ ] **Step 7: Commit, push, open chore PR, merge, tag**

```sh
git add CHANGELOG.md
git commit -m "chore: changelog for v2.3.0"
git push -u origin chore/release-v2.3.0
gh pr create --title "chore: changelog for v2.3.0" --body "Roll [Unreleased] → [2.3.0] for M6 — Telemetry."
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git tag -a v2.3.0 -m "v2.3.0"
git push origin v2.3.0
```

- [ ] **Step 8: Final prod smoke + verify tag**

```sh
gh run list -L 1 --workflow=Deploy
gh run watch <run-id> --exit-status
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
git tag -l --sort=-v:refname | head -3
# Expected: v2.3.0 (top), v2.2.0, v2.1.0
```

---

## Critical files referenced

| File | Purpose | Tasks |
|---|---|---|
| `apps/site/wrangler.jsonc` | adds `d1_databases` block binding `home-sh-telemetry` to the site Worker as `DB` | 1 |
| `apps/site/src/pages/api/telemetry/beacon.ts` (new) | POST handler — UUID validation, sample cap, D1 INSERT | 2 |
| `apps/site/src/pages/api/telemetry/beacon.test.ts` (new) | bun:test coverage of rejection branches + happy path | 2 |
| `apps/site/src/pages/api/telemetry/stats.ts` (new) | GET handler — batched aggregates, Cache API, CORS | 3 |
| `apps/site/src/pages/api/telemetry/stats.test.ts` (new) | bun:test coverage of shape + headers + no-id leak | 3 |
| `apps/site/src/lib/telemetry-client.ts` (new) | per-session UUID, LCP/wasm/fps capture, sendBeacon on pagehide, DNT gate | 4 |
| `apps/site/src/lib/telemetry-client.test.ts` (new) | unit tests for UUID gen, allowed-checks, deviceClass | 4 |
| `apps/site/src/lib/telemetry-stats-client.ts` (new) | fetches /api/telemetry/stats, fills `data-telemetry-stat` slots | 5 |
| `apps/site/src/lib/workspace-wip-client.ts` | dispatches `telemetry:wasm-ready` after canvas first paint | 5 |
| `apps/site/src/pages/workspace/index.astro` | telemetry pane: live stat slots; bootWorkspace mounts all three | 5 |
| `infra/workers/telemetry-{write,read}/` | DELETED in Task 6 (skeletons, never deployed) | 6 |
| `justfile` | `migrate-remote` retargeted at `apps/site/wrangler.jsonc`; `worker-types` cleaned up | 6 |
| `apps/site/tests/smoke/workspace.spec.ts` | adds 5 M6 acceptance gate tests (3 deployed-only) | 7 |
| `CHANGELOG.md` | rolls `[Unreleased]` → `[2.3.0]` | 8 |

---

## End-to-end verification (after Tasks 1–8)

```sh
# Local
cd /home/yanai/dev/sandbox/home-sh
bun run verify                                          # → green
bun run --cwd apps/site smoke                           # → all pass except 3 deployed-only skips
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke  # → all pass

# Production probe
curl -sI https://yanai.sh/api/telemetry/stats | grep -iE 'cache-control|access-control-allow-origin'
# → public, max-age=60, stale-while-revalidate=120; Access-Control-Allow-Origin: https://yanai.sh
curl -sS https://yanai.sh/api/telemetry/stats | jq 'keys'
# → ["avg_fps","avg_lcp_ms","device_breakdown","sessions_last_30d","top_countries","total_sessions"]
curl -sS -X POST https://yanai.sh/api/telemetry/beacon -H 'Content-Type: application/json' -d '{"id":"bad","started_at":1}'
# → {"error":"invalid_beacon"} HTTP 400
curl -sI https://yanai.sh/workspace | grep -iE 'cross-origin-(embedder|opener)-policy'
# → both headers present (M5 invariant, not affected)

# Schema check
cd apps/site && bunx wrangler d1 execute home-sh-telemetry --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
# → frame_samples, sessions, d1_migrations
```

## Order-of-operations notes

- **Task 1 must precede Tasks 2 + 3** — both endpoints reference `env.DB`, which the binding adds.
- **Task 4 must precede Task 5** — Task 5 imports `mountTelemetry` from the lib that Task 4 creates.
- **Task 5's wasm-ready event dispatch is the only product-code change in `mountCanvas`** — no behavioral change to canvas rendering itself.
- **Task 6 deletes the skeletons** — must come after Task 1 so the migration apply (which uses the skeleton's `migrations_dir` mapping) has run successfully.
- **Tasks 1–7 land on `feat/m6-telemetry`** as one PR. Task 8 ships changelog roll on `chore/release-v2.3.0` as a second PR.

## Rollback per task

- **Task 1 (D1 binding)**: revert `apps/site/wrangler.jsonc` and `git restore` the worker-configuration.d.ts. The migration is forward-only (D1 has no DROP path); leaving the schema in place is harmless if no Worker references it.
- **Task 2 (beacon)**: delete `apps/site/src/pages/api/telemetry/beacon.{ts,test.ts}`. Endpoint disappears at the Astro routing layer; D1 is left untouched.
- **Task 3 (stats)**: delete `apps/site/src/pages/api/telemetry/stats.{ts,test.ts}`. Same as Task 2.
- **Task 4 (client lib)**: delete `apps/site/src/lib/telemetry-client.{ts,test.ts}`. No callers if Task 5 hasn't landed.
- **Task 5 (wiring)**: revert all three files. Telemetry pane returns to its M5 static articles.
- **Task 6 (skeleton drop)**: `git revert` the deletion commit. Skeletons return to disk; they remain unbuilt.
- **Task 7 (smoke)**: revert the appended block. Existing M5 smoke tests are unaffected.
- **Task 8 (release)**: `git tag -d v2.3.0 && git push --delete origin v2.3.0` removes the tag. The rollback workflow at `.github/workflows/rollback.yml` promotes the prior immutable Worker version to 100%.

## Post-milestone

After M6 lands as v2.3.0:

1. Update `ROADMAP.md` — strike through M6 in the Milestones table (lines 448–465).
2. Move `M6 done` to `Backlog` and shortlist new candidates: site-wide page-load telemetry (currently scoped to `/workspace`), an RSS feed, or an `/api/telemetry/health` self-probe.
3. Optionally consolidate `home-sh-telemetry` migrations into a single namespace if a `0002_*.sql` ever appears.
