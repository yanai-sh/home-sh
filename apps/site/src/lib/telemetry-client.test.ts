import { describe, expect, it } from 'vitest';
import { deviceClass, isTelemetryAllowed, randomUuidV4 } from './telemetry-client';

describe('telemetry-client helpers', () => {
  it('randomUuidV4 matches UUIDv4 shape', () => {
    expect(randomUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('isTelemetryAllowed respects DNT and opt-out', () => {
    expect(isTelemetryAllowed({ doNotTrack: '1', optOut: false })).toBe(false);
    expect(isTelemetryAllowed({ doNotTrack: null, optOut: true })).toBe(false);
    expect(isTelemetryAllowed({ doNotTrack: null, optOut: false })).toBe(true);
  });

  it('deviceClass classifies common user agents', () => {
    expect(deviceClass('Mozilla/5.0 (iPhone)')).toBe('mobile');
    expect(deviceClass('Mozilla/5.0 (Windows NT 10.0)')).toBe('desktop');
  });
});
