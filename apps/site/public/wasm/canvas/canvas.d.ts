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
    set_page_phase(phase: number): void;
    set_pointer(x: number, y: number): void;
    set_theme(theme: number): void;
}

export function render_lattice(canvas: HTMLCanvasElement, width: number, height: number, mouse_x_norm: number, mouse_y_norm: number, time_ms: number): number;

export function render_systems_field(canvas: HTMLCanvasElement, width: number, height: number, pointer_x_norm: number, pointer_y_norm: number, time_ms: number, render_options: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_systemsfieldrenderer_free: (a: number, b: number) => void;
    readonly render_lattice: (a: any, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly render_systems_field: (a: any, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly systemsfieldrenderer_dispose: (a: number) => void;
    readonly systemsfieldrenderer_metrics: (a: number) => [number, number, number];
    readonly systemsfieldrenderer_new: (a: any, b: number, c: number) => [number, number, number];
    readonly systemsfieldrenderer_render: (a: number, b: number) => [number, number, number];
    readonly systemsfieldrenderer_resize: (a: number, b: number, c: number, d: number) => [number, number];
    readonly systemsfieldrenderer_set_page_phase: (a: number, b: number) => void;
    readonly systemsfieldrenderer_set_pointer: (a: number, b: number, c: number) => void;
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
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
