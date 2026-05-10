import { expect, test } from 'bun:test';
import { deviceClass, isTelemetryAllowed, randomUuidV4 } from './telemetry-client';

test('randomUuidV4 returns a valid UUIDv4 string', () => {
  for (let i = 0; i < 50; i += 1) {
    const id = randomUuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});

test('isTelemetryAllowed returns false when navigator.doNotTrack is "1"', () => {
  const result = isTelemetryAllowed({
    doNotTrack: '1',
    optOut: false,
  });
  expect(result).toBe(false);
});

test('isTelemetryAllowed returns false when optOut flag is set', () => {
  const result = isTelemetryAllowed({
    doNotTrack: null,
    optOut: true,
  });
  expect(result).toBe(false);
});

test('isTelemetryAllowed returns true when neither signal is set', () => {
  const result = isTelemetryAllowed({
    doNotTrack: null,
    optOut: false,
  });
  expect(result).toBe(true);
});

test('isTelemetryAllowed treats "yes" doNotTrack value as opt-out (older Firefox)', () => {
  const result = isTelemetryAllowed({
    doNotTrack: 'yes',
    optOut: false,
  });
  expect(result).toBe(false);
});

test('deviceClass returns "mobile" / "desktop" / "tablet" for typical UA strings', () => {
  expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
  expect(deviceClass('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
  expect(deviceClass('Mozilla/5.0 (X11; Linux x86_64)')).toBe('desktop');
  expect(deviceClass('Mozilla/5.0 (Android 14; Mobile)')).toBe('mobile');
  expect(deviceClass('Mozilla/5.0 (Android 14; Tablet)')).toBe('tablet');
});
