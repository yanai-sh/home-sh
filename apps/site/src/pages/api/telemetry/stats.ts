// GET /api/telemetry/stats — aggregates from home-sh-telemetry D1, edge-cached 60s
// (stale-while-revalidate 120s). No per-session identifiers in the JSON body.

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
  // Workers expose `caches.default`; DOM `CacheStorage` typing omits it.
  const cache = (caches as unknown as { default: Cache }).default;
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
    total_sessions: (total.results[0] as ScalarRow | undefined)?.n ?? 0,
    sessions_last_30d: (recent.results[0] as ScalarRow | undefined)?.n ?? 0,
    avg_lcp_ms: (avgLcp.results[0] as AvgRow | undefined)?.v ?? null,
    avg_fps: (avgFps.results[0] as AvgRow | undefined)?.v ?? null,
    top_countries: countries.results as CountryRow[],
    device_breakdown: devices.results as DeviceRow[],
  };

  const response = jsonResponse(stats);
  await cache.put(cacheKey, response.clone());
  return response;
};
