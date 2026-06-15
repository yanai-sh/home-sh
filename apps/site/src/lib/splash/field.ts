/**
 * Splash field entry point. Picks the renderer:
 *   - normal motion + WebGL2 → live "paint in water" fluid (field-fluid.ts)
 *   - reduced motion, or no WebGL2 → a pre-baked still swirl frame applied via
 *     CSS (.is-splash-still; themed by --splash-still in global.css)
 * The still frame replaces the old Canvas 2D bloom fallback: it shows the same
 * developed-swirl imagery the live version produces, as a static image, which
 * the library itself can't freeze at runtime (its config is copied at init, so
 * there's no way to "run then pause").
 * Both paths expose the same handle, so callers don't care which ran.
 */

import { initFluidField } from './field-fluid';

export type SplashFieldHandle = {
  dispose: () => void;
  syncTheme: () => void;
};

// CSS handles the still frame (image + per-theme swap), so the handle is inert.
const STILL_HANDLE: SplashFieldHandle = { dispose: () => {}, syncTheme: () => {} };

export function initSplashField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: { reducedMotion: boolean },
): SplashFieldHandle | null {
  if (options.reducedMotion) {
    layer.classList.add('is-splash-still');
    return STILL_HANDLE;
  }

  const fluid = initFluidField(canvas, layer);
  if (fluid) return fluid;

  // No WebGL2 — fall back to the same baked still frame.
  layer.classList.add('is-splash-still');
  return STILL_HANDLE;
}
