interface Env {
  DB: D1Database;
}

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_DEVICE_CLASSES = new Set(['desktop', 'mobile', 'tablet']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let beacon: SessionBeacon;
    try {
      beacon = await request.json() as SessionBeacon;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    if (
      typeof beacon.id !== 'string' || !UUID_RE.test(beacon.id) ||
      typeof beacon.started_at !== 'number' || !Number.isFinite(beacon.started_at)
    ) {
      return json({ error: 'Invalid beacon' }, 400);
    }

    // Country comes from Cloudflare's edge header — never trust the client for this
    const country = request.headers.get('CF-IPCountry') ?? null;
    const deviceClass = VALID_DEVICE_CLASSES.has(beacon.device_class ?? '') ? beacon.device_class! : null;
    const uaFamily = typeof beacon.ua_family === 'string' ? beacon.ua_family.slice(0, 64) : null;
    const lcpMs = Number.isFinite(beacon.lcp_ms) ? beacon.lcp_ms! : null;
    const wasmInitMs = Number.isFinite(beacon.wasm_init_ms) ? beacon.wasm_init_ms! : null;

    await env.DB.prepare(
      `INSERT OR IGNORE INTO sessions (id, started_at, country, device_class, ua_family, lcp_ms, wasm_init_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(beacon.id, beacon.started_at, country, deviceClass, uaFamily, lcpMs, wasmInitMs).run();

    if (Array.isArray(beacon.frame_samples) && beacon.frame_samples.length > 0) {
      const samples = beacon.frame_samples.slice(0, 300);
      const stmt = env.DB.prepare(
        `INSERT INTO frame_samples (session_id, t, fps, tick_rate) VALUES (?, ?, ?, ?)`
      );
      const valid = samples.filter((s): s is FrameSample => Number.isFinite(s?.t));
      if (valid.length > 0) {
        await env.DB.batch(
          valid.map(s => stmt.bind(beacon.id, s.t, s.fps ?? null, s.tick_rate ?? null))
        );
      }
    }

    return json({ ok: true });
  },
} satisfies ExportedHandler<Env>;
