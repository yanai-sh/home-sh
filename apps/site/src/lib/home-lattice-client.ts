/**
 * Lazy WASM lattice behind the homepage hero — no SharedArrayBuffer (COEP is
 * workspace-only). Pointer-driven coords; rAF gated by visibility and motion
 * preference; coarse pointers skip every other frame to save mobile battery.
 */

import { type CanvasWasmModule, loadCanvasWasm } from '@lib/load-canvas-wasm';

function scheduleIdle(init: () => void): void {
  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => init(), { timeout: 2200 });
    return;
  }
  globalThis.requestAnimationFrame(() => init());
}

export function mountHomeLattice(): void {
  const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reduceMotion) return;

  const canvas = document.getElementById('home-lattice-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;

  let mod: CanvasWasmModule | undefined;
  let mxNorm = 0.5;
  let myNorm = 0.5;
  let rafId: number | null = null;
  let coarseSkip = false;
  let visible = false;

  const onPointer = (event: PointerEvent) => {
    mxNorm = event.clientX / (globalThis.innerWidth || 1);
    myNorm = event.clientY / (globalThis.innerHeight || 1);
  };

  const drawFrame = (timeMs: number) => {
    if (!mod) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    try {
      mod.render_lattice(canvas, rect.width, rect.height, mxNorm, myNorm, timeMs);
    } catch (error) {
      console.warn('home-lattice: render failed', error);
    }
  };

  const loop = (timeMs: number) => {
    rafId = globalThis.requestAnimationFrame(loop);
    if (coarse) {
      coarseSkip = !coarseSkip;
      if (coarseSkip) return;
    }
    drawFrame(timeMs);
  };

  const startLoop = () => {
    if (rafId !== null || !mod || !visible) return;
    rafId = globalThis.requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    if (rafId !== null) {
      globalThis.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible && mod) startLoop();
      else stopLoop();
    },
    { threshold: 0, rootMargin: '64px' },
  );
  visibility.observe(canvas);

  const resizeObserver = new ResizeObserver(() => {
    if (mod) drawFrame(performance.now());
  });
  resizeObserver.observe(canvas);

  globalThis.addEventListener('pointermove', onPointer, { passive: true });

  const init = async () => {
    const wasmStart = performance.now();
    try {
      mod = await loadCanvasWasm();
      globalThis.dispatchEvent(
        new CustomEvent('telemetry:wasm-ready', {
          detail: { ms: performance.now() - wasmStart, surface: 'home' },
        }),
      );
      drawFrame(performance.now());
      const rect = canvas.getBoundingClientRect();
      visible = rect.top < globalThis.innerHeight && rect.bottom > 0;
      if (visible) startLoop();
    } catch (error) {
      console.warn('home-lattice: WASM load failed', error);
    }
  };

  const onLoad = () => scheduleIdle(init);
  if (document.readyState === 'complete') {
    onLoad();
  } else {
    globalThis.addEventListener('load', onLoad, { once: true });
  }
}
