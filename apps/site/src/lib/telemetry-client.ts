import type { SessionBeacon } from './telemetry-types';

const BEACON_PATH = '/api/telemetry/beacon';
const FRAME_SAMPLE_INTERVAL_MS = 5_000;
const FRAME_SAMPLE_CAP = 60;

export function randomUuidV4(): string {
  return crypto.randomUUID();
}

export function isTelemetryAllowed(signals: {
  doNotTrack: string | null;
  optOut: boolean;
}): boolean {
  if (signals.optOut) return false;
  if (signals.doNotTrack === '1' || signals.doNotTrack === 'yes') return false;
  return true;
}

export function deviceClass(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/iPad|Android(?!.*Mobile).*Tablet/i.test(ua)) return 'tablet';
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function uaFamily(ua: string): string {
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

export type TelemetryHandle = {
  flush(): boolean;
};

export function mountTelemetry(): TelemetryHandle | null {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return null;

  const allowed = isTelemetryAllowed({
    doNotTrack: navigator.doNotTrack,
    optOut: (() => {
      try {
        return localStorage.getItem('telemetry:opt-out') === '1';
      } catch {
        return false;
      }
    })(),
  });
  if (!allowed) return null;

  const beacon: SessionBeacon = {
    id: randomUuidV4(),
    started_at: Date.now(),
    device_class: deviceClass(navigator.userAgent),
    ua_family: uaFamily(navigator.userAgent),
    frame_samples: [],
  };

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) beacon.lcp_ms = Math.round(last.startTime);
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // unsupported entry type
  }

  window.addEventListener(
    'telemetry:wasm-ready',
    (event) => {
      const detail = (event as CustomEvent<{ ms: number }>).detail;
      if (detail && Number.isFinite(detail.ms)) beacon.wasm_init_ms = Math.round(detail.ms);
    },
    { once: true },
  );

  let frames = 0;
  let lastSampleAt = performance.now();
  const tick = (): void => {
    frames += 1;
    const now = performance.now();
    if (now - lastSampleAt >= FRAME_SAMPLE_INTERVAL_MS) {
      const fps = Math.round((frames * 1000) / (now - lastSampleAt));
      if (beacon.frame_samples!.length < FRAME_SAMPLE_CAP) {
        beacon.frame_samples!.push({ t: Math.round(Date.now()), fps });
      }
      frames = 0;
      lastSampleAt = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let sent = false;
  const send = (): boolean => {
    if (sent) return false;
    sent = true;
    try {
      return navigator.sendBeacon(
        BEACON_PATH,
        new Blob([JSON.stringify(beacon)], { type: 'application/json' }),
      );
    } catch {
      return false;
    }
  };

  window.addEventListener('pagehide', send, { once: false });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });

  return { flush: send };
}
