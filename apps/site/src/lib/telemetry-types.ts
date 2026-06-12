export type FrameSample = {
  t: number;
  fps?: number;
  tick_rate?: number;
};

export type SessionBeacon = {
  id: string;
  started_at: number;
  device_class?: string;
  ua_family?: string;
  lcp_ms?: number;
  wasm_init_ms?: number;
  frame_samples?: FrameSample[];
};

export type CountryRow = { country: string; count: number };
export type DeviceRow = { device_class: string; count: number };

export type TelemetryStats = {
  total_sessions: number;
  sessions_last_30d: number;
  avg_lcp_ms: number | null;
  avg_fps: number | null;
  top_countries: CountryRow[];
  device_breakdown: DeviceRow[];
};
