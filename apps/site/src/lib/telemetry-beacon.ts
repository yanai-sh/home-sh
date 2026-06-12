import type { SessionBeacon } from './telemetry-types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_DEVICE_CLASSES = new Set(['desktop', 'mobile', 'tablet']);
const FRAME_SAMPLE_CAP = 300;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function ingestSessionBeacon(request: Request, db: D1Database): Promise<Response> {
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

  await db
    .prepare(
      `INSERT OR IGNORE INTO sessions (id, started_at, country, device_class, ua_family, lcp_ms, wasm_init_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(beacon.id, beacon.started_at, country, deviceClass, uaFamily, lcpMs, wasmInitMs)
    .run();

  if (Array.isArray(beacon.frame_samples) && beacon.frame_samples.length > 0) {
    const samples = beacon.frame_samples.slice(0, FRAME_SAMPLE_CAP);
    const valid = samples.filter((sample) => Number.isFinite(sample?.t));
    if (valid.length > 0) {
      const stmt = db.prepare(
        `INSERT INTO frame_samples (session_id, t, fps, tick_rate) VALUES (?, ?, ?, ?)`,
      );
      await db.batch(
        valid.map((sample) =>
          stmt.bind(beacon.id, sample.t, sample.fps ?? null, sample.tick_rate ?? null),
        ),
      );
    }
  }

  return json({ ok: true });
}
