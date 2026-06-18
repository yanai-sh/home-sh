/**
 * Earliest splash-field boot — loaded as a module script immediately after the
 * canvas markup in +page.svelte (before Svelte hydration / onMount).
 */
import { initSplashField, type SplashFieldHandle } from "./field";

declare global {
  interface Window {
    __splashFieldHandle?: SplashFieldHandle | null;
  }
}

function boot(): void {
  if (window.__splashFieldHandle !== undefined) return;

  const layer = document.querySelector<HTMLElement>("[data-splash-field]");
  const canvas = document.querySelector<HTMLCanvasElement>("[data-splash-field-canvas]");
  if (!layer || !canvas) {
    window.__splashFieldHandle = null;
    return;
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const handle = initSplashField(canvas, layer, { reducedMotion });
  window.__splashFieldHandle = handle ?? null;

  if (handle) {
    window.addEventListener("pagehide", () => handle.dispose(), { once: true });
  }
}

boot();
