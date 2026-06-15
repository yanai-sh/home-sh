/**
 * Splash field entry point. Picks the renderer:
 *   - normal motion → WebGL2 fluid simulation (field-fluid.ts) if supported
 *   - no WebGL / reduced motion → Canvas 2D soft blooms (field-bloom.ts)
 * Both expose the same handle, so callers don't care which ran.
 */

import { initBloomField } from './field-bloom';
import { initFluidField } from './field-fluid';

export type SplashFieldHandle = {
  dispose: () => void;
  syncTheme: () => void;
};

export function initSplashField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: { reducedMotion: boolean },
): SplashFieldHandle | null {
  if (!options.reducedMotion) {
    const fluid = initFluidField(canvas, layer);
    if (fluid) return fluid;
    // Fluid bailed (no WebGL2 / float targets). A canvas that has handed out a
    // WebGL context can't also give a 2D one, so swap in a fresh clone (keeps
    // the same attributes/classes) before the Canvas 2D fallback runs.
    const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.replaceWith(fresh);
    canvas = fresh;
  }
  return initBloomField(canvas, layer, options);
}
