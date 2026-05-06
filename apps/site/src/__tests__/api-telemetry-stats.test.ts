import { expect, mock, test } from 'bun:test';

const cacheDefault = {
  match: mock(async () => undefined as Response | undefined),
  put: mock(async () => undefined),
};

(globalThis as unknown as { caches: { default: typeof cacheDefault } }).caches = {
  default: cacheDefault,
};

const dbMock = {
  prepare: mock((_sql: string) => {
    const stmt = { bind: mock(() => stmt) };
    return stmt;
  }),
  batch: mock(async () => [
    { success: true as const, meta: {}, results: [{ n: 42 }] },
    { success: true as const, meta: {}, results: [{ n: 17 }] },
    { success: true as const, meta: {}, results: [{ v: 1234 }] },
    { success: true as const, meta: {}, results: [{ v: 58.5 }] },
    {
      success: true as const,
      meta: {},
      results: [
        { country: 'US', count: 10 },
        { country: 'IL', count: 5 },
      ],
    },
    {
      success: true as const,
      meta: {},
      results: [
        { device_class: 'desktop', count: 30 },
        { device_class: 'mobile', count: 12 },
      ],
    },
  ]),
};

mock.module('cloudflare:workers', () => ({ env: { DB: dbMock } }));

const { GET } = await import('../pages/api/telemetry/stats');

test('returns aggregate JSON shape with all expected keys', async () => {
  const ctx = {
    request: new Request('https://yanai.sh/api/telemetry/stats'),
    waitUntil: () => undefined,
  };
  // @ts-expect-error — Astro APIContext shape; exercise GET directly.
  const res = await GET(ctx);
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual([
    'avg_fps',
    'avg_lcp_ms',
    'device_breakdown',
    'sessions_last_30d',
    'top_countries',
    'total_sessions',
  ]);
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
  expect(JSON.stringify(body)).not.toMatch(/\bid\b/);
});
