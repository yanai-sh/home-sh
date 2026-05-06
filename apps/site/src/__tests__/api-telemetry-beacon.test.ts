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

const { POST } = await import('../pages/api/telemetry/beacon');

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
  type BeaconImports = typeof import('../pages/api/telemetry/beacon');
  const beaconMod = (await import('../pages/api/telemetry/beacon')) as BeaconImports & {
    GET?: unknown;
  };
  expect(beaconMod.GET).toBeUndefined();
});
