/**
 * Single import path + promise cache for `/wasm/canvas/canvas.js` (Lyon lattice).
 * Used by the homepage hero and /workspace so behavior and warm-cache stay aligned.
 */

export interface CanvasWasmModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  render_lattice(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    mouseXNorm: number,
    mouseYNorm: number,
    timeMs: number,
  ): number;
}

let canvasModulePromise: Promise<CanvasWasmModule> | null = null;

export function loadCanvasWasm(): Promise<CanvasWasmModule> {
  canvasModulePromise ??= (async (): Promise<CanvasWasmModule> => {
    const href = new URL('/wasm/canvas/canvas.js', globalThis.location.href).href;
    const mod = (await import(/* @vite-ignore */ href)) as unknown as CanvasWasmModule;
    await mod.default();
    return mod;
  })();
  return canvasModulePromise;
}
