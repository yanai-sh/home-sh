/**
 * Live, interactive "paint in water" splash background, powered by the
 * maintained `webgl-fluid` package (Pavel Dobryakov's WebGL fluid simulation).
 * Returns null when WebGL2 is unavailable so the caller can fall back to the
 * pre-baked still frame (see field.ts). TRANSPARENT mode lets the themed page
 * background show through, so light/dark theming is handled by CSS with no
 * re-init. Only runs when motion is allowed — reduced motion is handled in
 * field.ts with a static image.
 */

import WebGLFluid from 'webgl-fluid';
import type { SplashFieldHandle } from './field';

export function initFluidField(canvas: HTMLCanvasElement, layer: HTMLElement): SplashFieldHandle | null {
  // Probe on a throwaway canvas so we don't lock the real canvas into a context
  // with the wrong attributes before the library configures it.
  let supported = false;
  try {
    supported = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    supported = false;
  }
  if (!supported) return null;

  // Tasteful, not a flashy demo: gentle curl, moderate dissipation (so it neither
  // builds into a solid wash nor empties out), no bloom/sunrays. IMMEDIATE paints
  // an opening splat frame right away; AUTO + INTERVAL keep a few splats drifting
  // in at rest; TRIGGER 'hover' stirs it with the pointer.
  const config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 2.2,
    VELOCITY_DISSIPATION: 1.8,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 4,
    SPLAT_RADIUS: 0.22,
    SPLAT_FORCE: 5200,
    // A small count lets each splat curl into a distinct spiral rather than
    // crowding into merged blobs.
    SPLAT_COUNT: 7,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 6,
    TRANSPARENT: true,
    BLOOM: false,
    SUNRAYS: false,
    AUTO: true,
    INTERVAL: 3500,
    IMMEDIATE: true,
    TRIGGER: 'hover' as const,
    PAUSED: false,
  };

  try {
    WebGLFluid(canvas, config);
  } catch {
    return null;
  }

  layer.classList.add('is-splash-field-ready');

  return {
    // The library exposes no teardown or runtime pause (it copies config at init),
    // so there's no real stop. The splash lives for the session; minor.
    dispose: () => {},
    // Theme is handled by the CSS background showing through the transparent
    // canvas, so nothing to re-sync here.
    syncTheme: () => {},
  };
}
