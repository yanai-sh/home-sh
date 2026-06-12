import { Hono } from 'hono';
import { ingestSessionBeacon } from '@lib/telemetry-beacon';
import { fetchTelemetryStats } from '@lib/telemetry-stats';

export const telemetryRoutes = new Hono<{ Bindings: Env }>();

telemetryRoutes.post('/api/telemetry/beacon', async (c) => {
  return ingestSessionBeacon(c.req.raw, c.env.DB);
});

telemetryRoutes.get('/api/telemetry/stats', async (c) => {
  return fetchTelemetryStats(c.req.raw, c.env.DB);
});
