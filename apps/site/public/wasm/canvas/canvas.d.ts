/* tslint:disable */
/* eslint-disable */

export class SystemsFieldRenderer {
  free(): void;
  [Symbol.dispose](): void;
  dispose(): void;
  metrics(): any;
  constructor(canvas: HTMLCanvasElement, seed: number, quality: number);
  render(time_ms: number): number;
  resize(width: number, height: number, dpr: number): void;
  set_boot_progress(progress: number): void;
  set_doc_state(state: number): void;
  set_focus(x: number, y: number, strength: number): void;
  set_form_intensity(intensity: number): void;
  set_form_state(state: number): void;
  set_page_phase(phase: number): void;
  set_pointer(x: number, y: number): void;
  set_reveal(progress: number): void;
  set_split_progress(progress: number): void;
  set_split_target(target: number): void;
  set_theme(theme: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_systemsfieldrenderer_free: (a: number, b: number) => void;
  readonly systemsfieldrenderer_dispose: (a: number) => void;
  readonly systemsfieldrenderer_metrics: (a: number) => [number, number, number];
  readonly systemsfieldrenderer_new: (a: any, b: number, c: number) => [number, number, number];
  readonly systemsfieldrenderer_render: (a: number, b: number) => [number, number, number];
  readonly systemsfieldrenderer_resize: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number];
  readonly systemsfieldrenderer_set_boot_progress: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_doc_state: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_focus: (a: number, b: number, c: number, d: number) => void;
  readonly systemsfieldrenderer_set_form_intensity: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_form_state: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_page_phase: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_pointer: (a: number, b: number, c: number) => void;
  readonly systemsfieldrenderer_set_reveal: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_split_progress: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_split_target: (a: number, b: number) => void;
  readonly systemsfieldrenderer_set_theme: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
