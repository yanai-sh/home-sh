import type { TelemetryStats } from './telemetry-types';

const ALLOWED_ORIGIN = 'https://yanai.sh';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ScalarRow = { n: number };
type AvgRow = { v: number | null };

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });

export async function fetchTelemetryStats(request: Request, db: D1Database): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/telemetry/stats', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const [total, recent, avgLcp, avgFps, countries, devices] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM sessions`),
    db.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE started_at >= ?`).bind(cutoff),
    db.prepare(`SELECT AVG(lcp_ms) AS v FROM sessions WHERE lcp_ms IS NOT NULL`),
    db.prepare(`SELECT AVG(fps) AS v FROM frame_samples WHERE fps IS NOT NULL`),
    db.prepare(
      `SELECT country, COUNT(*) AS count FROM sessions
       WHERE country IS NOT NULL AND country != 'XX'
       GROUP BY country ORDER BY count DESC LIMIT 10`,
    ),
    db.prepare(
      `SELECT device_class, COUNT(*) AS count FROM sessions
       WHERE device_class IS NOT NULL GROUP BY device_class ORDER BY count DESC`,
    ),
  ]);

  const stats: TelemetryStats = {
    total_sessions: (total.results[0] as ScalarRow)?.n ?? 0,
    sessions_last_30d: (recent.results[0] as ScalarRow)?.n ?? 0,
    avg_lcp_ms: (avgLcp.results[0] as AvgRow)?.v ?? null,
    avg_fps: (avgFps.results[0] as AvgRow)?.v ?? null,
    top_countries: countries.results as TelemetryStats['top_countries'],
    device_breakdown: devices.results as TelemetryStats['device_breakdown'],
  };

  const response = jsonResponse(stats);
  await cache.put(cacheKey, response.clone());
  return response;
}
