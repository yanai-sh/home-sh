// POST /api/telemetry/beacon — coarse session beacon → home-sh-telemetry D1.
// Validates UUIDv4 and caps `frame_samples` at 300. Country from CF-IPCountry only.

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
  const rawDevice = beacon.device_class;
  const deviceClass =
    typeof rawDevice === 'string' && VALID_DEVICE_CLASSES.has(rawDevice) ? rawDevice : null;
  const uaFamily = typeof beacon.ua_family === 'string' ? beacon.ua_family.slice(0, 64) : null;
  const lcpMs =
    typeof beacon.lcp_ms === 'number' && Number.isFinite(beacon.lcp_ms) ? beacon.lcp_ms : null;
  const wasmInitMs =
    typeof beacon.wasm_init_ms === 'number' && Number.isFinite(beacon.wasm_init_ms)
      ? beacon.wasm_init_ms
      : null;

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
