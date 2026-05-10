// Fetch /api/telemetry/stats and fill `[data-telemetry-stat]` slots (fail-soft).

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
