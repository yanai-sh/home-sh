import { describe, expect, test } from 'bun:test';
import { FOOTER_EDGE_DEFAULTS, footerEdgeProps } from './footer-edge';

function requestWith(headers: Record<string, string> = {}, cf?: { colo?: string }): Request {
  const r = new Request('https://yanai.sh/', { headers: new Headers(headers) });
  if (cf !== undefined) {
    Object.assign(r, { cf });
  }
  return r;
}

describe('footerEdgeProps', () => {
  test('uses defaults when cf-ray and cf are absent', () => {
    const p = footerEdgeProps(new Request('https://yanai.sh/'));
    expect(p.protocol).toBe(FOOTER_EDGE_DEFAULTS.protocol);
    expect(p.colo).toBe(FOOTER_EDGE_DEFAULTS.colo);
    expect(p.ray).toBe(FOOTER_EDGE_DEFAULTS.ray.split('-')[0].toUpperCase());
  });

  test('uppercases x-forwarded-proto', () => {
    const p = footerEdgeProps(requestWith({ 'x-forwarded-proto': 'https' }));
    expect(p.protocol).toBe('HTTPS');
  });

  test('reads cf.colo when present', () => {
    const p = footerEdgeProps(requestWith({}, { colo: 'DFW' }));
    expect(p.colo).toBe('DFW');
  });

  test('takes cf-ray segment before first hyphen and uppercases', () => {
    const p = footerEdgeProps(requestWith({ 'cf-ray': 'abc123def-SJC' }));
    expect(p.ray).toBe('ABC123DEF');
  });
});
