import { describe, expect, it, vi } from 'vitest';
import { ingestSessionBeacon } from './telemetry-beacon';

function createDbMock() {
  const batchCalls: unknown[][] = [];
  const db = {
    prepare: vi.fn(() => {
      const stmt = {
        bind: vi.fn(() => stmt),
        run: vi.fn(async () => ({ success: true })),
      };
      return stmt;
    }),
    batch: vi.fn(async (statements: unknown[]) => {
      batchCalls.push(statements);
      return [];
    }),
  };
  return { db: db as unknown as D1Database, batchCalls };
}

describe('ingestSessionBeacon', () => {
  it('rejects malformed UUID', async () => {
    const { db } = createDbMock();
    const response = await ingestSessionBeacon(
      new Request('https://yanai.sh/api/telemetry/beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'bad', started_at: Date.now() }),
      }),
      db,
    );
    expect(response.status).toBe(400);
  });

  it('caps frame_samples at 300', async () => {
    const { db, batchCalls } = createDbMock();
    const samples = Array.from({ length: 1000 }, (_, index) => ({ t: index, fps: 60 }));
    const response = await ingestSessionBeacon(
      new Request('https://yanai.sh/api/telemetry/beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-IPCountry': 'US' },
        body: JSON.stringify({
          id: '22222222-2222-4222-8222-222222222222',
          started_at: Date.now(),
          frame_samples: samples,
        }),
      }),
      db,
    );
    expect(response.status).toBe(200);
    expect(batchCalls[0]).toHaveLength(300);
  });

  it('accepts a clean beacon', async () => {
    const { db } = createDbMock();
    const response = await ingestSessionBeacon(
      new Request('https://yanai.sh/api/telemetry/beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '33333333-3333-4333-8333-333333333333',
          started_at: Date.now(),
          device_class: 'desktop',
        }),
      }),
      db,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
