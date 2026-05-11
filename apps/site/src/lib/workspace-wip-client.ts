import { loadCanvasWasm } from '@lib/load-canvas-wasm';
import type { SearchHit } from '@lib/search-client';
import { createSharedState } from '@lib/shared-state';

interface BridgeModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  shared_state_bytes(): number;
  shared_state_offset(field: string): number | undefined;
}

interface StatusTargets {
  wasm: HTMLElement | null;
  sab: HTMLElement | null;
  canvas: HTMLElement | null;
  search: HTMLElement | null;
}

const statusText = {
  pending: 'pending',
  ready: 'ready',
  off: 'off',
  error: 'error',
} as const;

type SearchWorkerRequest =
  | {
      id: number;
      type: 'init';
    }
  | {
      id: number;
      type: 'search';
      query: string;
    };
type SearchWorkerPayload =
  | {
      type: 'init';
    }
  | {
      type: 'search';
      query: string;
    };

type SearchWorkerResponse =
  | {
      id: number;
      type: 'ready';
      len: number;
    }
  | {
      id: number;
      type: 'results';
      hits: SearchHit[];
    }
  | {
      id: number;
      type: 'error';
      message: string;
    };

/** DOM ids for canvas + workspace search panel (defaults match `/workspace` legacy markup). */
export interface WorkspaceWipDomIds {
  canvas: string;
  searchTrigger: string;
  searchClose: string;
  searchPanel: string;
  searchInput: string;
  searchResults: string;
}

export const DEFAULT_WORKSPACE_WIP_DOM_IDS: WorkspaceWipDomIds = {
  canvas: 'ws-rust-canvas',
  searchTrigger: 'ws-search-trigger',
  searchClose: 'ws-search-close',
  searchPanel: 'ws-search-panel',
  searchInput: 'ws-search-input',
  searchResults: 'ws-search-results',
};

export function mountWorkspaceWip(domIds: Partial<WorkspaceWipDomIds> = {}): void {
  const ids: WorkspaceWipDomIds = { ...DEFAULT_WORKSPACE_WIP_DOM_IDS, ...domIds };
  const targets: StatusTargets = {
    wasm: document.querySelector('[data-wip-status="wasm"]'),
    sab: document.querySelector('[data-wip-status="sab"]'),
    canvas: document.querySelector('[data-wip-status="canvas"]'),
    search: document.querySelector('[data-wip-status="search"]'),
  };

  // mountSharedState resolves to the SharedStateWriters (or undefined if
  // crossOriginIsolated is false / SAB unavailable). Canvas waits for it so
  // the animation can read mouse coords; if SAB never resolves, canvas falls
  // back to a static render.
  const sharedStatePromise = mountSharedState(targets);
  void mountCanvas(targets, sharedStatePromise, ids.canvas);
  mountSearch(targets, ids);
  mountPaneNavigation();
}

function setStatus(target: HTMLElement | null, state: keyof typeof statusText): void {
  if (!target) return;
  target.dataset.state = state;
  const value = target.querySelector<HTMLElement>('[data-wip-value]');
  if (value) value.textContent = statusText[state];
}

async function mountSharedState(
  targets: StatusTargets,
): Promise<import('@lib/shared-state').SharedStateWriters | undefined> {
  try {
    const { writers } = createSharedState();
    const moduleUrl = new URL('/wasm/bridge/bridge.js', globalThis.location.href).href;
    const bridge = (await import(/* @vite-ignore */ moduleUrl)) as unknown as BridgeModule;
    await bridge.default();
    if (bridge.shared_state_bytes() !== 32 || bridge.shared_state_offset('frame_counter') !== 24) {
      throw new Error('bridge WASM wire format does not match the JS SharedArrayBuffer view');
    }
    setStatus(targets.sab, 'ready');

    let lastX = window.scrollX;
    window.addEventListener(
      'pointermove',
      (event) => {
        writers.setMouse(event.clientX, event.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      'scroll',
      () => {
        const vx = window.scrollX - lastX;
        lastX = window.scrollX;
        writers.setScrollVelocity(vx);
      },
      { passive: true },
    );
    document.addEventListener('visibilitychange', () => {
      writers.setTickTarget(
        document.hidden ? 1 : matchMedia('(pointer: coarse)').matches ? 30 : 60,
      );
    });
    return writers;
  } catch {
    setStatus(targets.sab, 'off');
    return undefined;
  }
}

async function mountCanvas(
  targets: StatusTargets,
  sharedStatePromise: Promise<import('@lib/shared-state').SharedStateWriters | undefined>,
  canvasElementId: string,
): Promise<void> {
  const canvas = document.getElementById(canvasElementId);
  if (!(canvas instanceof HTMLCanvasElement)) return;

  // prefers-reduced-motion users get a single static render (or none if the
  // CSS rule has hidden the canvas entirely — `display: none` short-circuits
  // getBoundingClientRect to width=0/height=0, which we guard below).
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wasmStart = performance.now();
  let mod: Awaited<ReturnType<typeof loadCanvasWasm>>;
  try {
    mod = await loadCanvasWasm();
    setStatus(targets.wasm, 'ready');
    window.dispatchEvent(
      new CustomEvent('telemetry:wasm-ready', { detail: { ms: performance.now() - wasmStart } }),
    );
  } catch (error) {
    console.error('canvas: WASM load failed', error);
    setStatus(targets.wasm, 'error');
    setStatus(targets.canvas, 'error');
    return;
  }

  const writers = await sharedStatePromise;

  const drawFrame = (timeMs: number) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    // `|| 1` guards against zero-sized viewports (headless / detached frames)
    // that would otherwise NaN-poison the normalized coords.
    const mxNorm = writers ? writers.readMouseX() / (window.innerWidth || 1) : 0.5;
    const myNorm = writers ? writers.readMouseY() / (window.innerHeight || 1) : 0.5;
    mod.render_lattice(canvas, rect.width, rect.height, mxNorm, myNorm, timeMs);
  };

  // First paint so a frame is ready the moment the IntersectionObserver starts
  // the loop. render_lattice can throw on canvas 2D context errors, so guard
  // the call and surface a runtime-strip status rather than letting the
  // promise reject silently.
  try {
    drawFrame(performance.now());
    setStatus(targets.canvas, 'ready');
  } catch (error) {
    console.error('canvas: first paint failed', error);
    setStatus(targets.canvas, 'error');
    return;
  }

  if (reducedMotion) return;

  let rafId: number | null = null;
  const loop = (timeMs: number) => {
    drawFrame(timeMs);
    rafId = requestAnimationFrame(loop);
  };

  // Gate the loop on canvas visibility — pause when the projects pane scrolls
  // off-screen so we don't burn CPU on a hidden surface.
  const visibility = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && rafId === null) {
        rafId = requestAnimationFrame(loop);
      } else if (!visible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { threshold: 0 },
  );
  visibility.observe(canvas);

  // Resize triggers a single re-draw; the rAF loop will pick it up on the
  // next frame anyway, but a synchronous redraw avoids a one-frame stretch
  // on the new buffer dimensions.
  const resizeObserver = new ResizeObserver(() => drawFrame(performance.now()));
  resizeObserver.observe(canvas);
}

function mountSearch(targets: StatusTargets, ids: WorkspaceWipDomIds): void {
  const trigger = document.getElementById(ids.searchTrigger);
  const closeButton = document.getElementById(ids.searchClose);
  const panel = document.getElementById(ids.searchPanel);
  const input = document.getElementById(ids.searchInput);
  const results = document.getElementById(ids.searchResults);

  if (!(trigger instanceof HTMLButtonElement)) return;
  if (!(closeButton instanceof HTMLButtonElement)) return;
  if (!(panel instanceof HTMLElement)) return;
  if (!(input instanceof HTMLInputElement)) return;
  if (!(results instanceof HTMLElement)) return;

  const search = createSearchWorkerClient();

  const open = async () => {
    panel.hidden = false;
    input.focus();

    try {
      const len = await search.init();
      setStatus(targets.search, 'ready');
      if (!input.value.trim()) {
        renderSearchEmpty(results, `${len} indexed entries`);
      }
    } catch (error) {
      console.error(error);
      setStatus(targets.search, 'error');
      renderSearchEmpty(results, 'search unavailable');
    }
  };

  const close = () => {
    panel.hidden = true;
    input.value = '';
    results.textContent = '';
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (
      event.key === '/' &&
      document.activeElement !== input &&
      !isFormField(document.activeElement)
    ) {
      event.preventDefault();
      void open();
    }
    if (event.key === 'Escape' && !panel.hidden) {
      close();
    }
  });

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (!query) {
      const len = await search.init();
      renderSearchEmpty(results, `${len} indexed entries`);
      return;
    }

    try {
      renderSearchResults(results, await search.search(query));
    } catch {
      setStatus(targets.search, 'error');
      renderSearchEmpty(results, 'search unavailable');
    }
  });

  results.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    close();
  });
}

function createSearchWorkerClient() {
  const worker = new Worker(new URL('./workspace-search-worker.ts', import.meta.url), {
    type: 'module',
  });
  let nextId = 0;
  const pending = new Map<
    number,
    {
      reject(error: Error): void;
      resolve(value: SearchHit[] | number): void;
    }
  >();

  worker.addEventListener('message', (event: MessageEvent<SearchWorkerResponse>) => {
    const message = event.data;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);

    if (message.type === 'error') {
      request.reject(new Error(message.message));
      return;
    }

    request.resolve(message.type === 'ready' ? message.len : message.hits);
  });

  function send(message: SearchWorkerPayload): Promise<SearchHit[] | number> {
    const id = nextId;
    nextId += 1;
    const promise = new Promise<SearchHit[] | number>((resolve, reject) => {
      pending.set(id, { reject, resolve });
    });
    worker.postMessage({ ...message, id } satisfies SearchWorkerRequest);
    return promise;
  }

  return {
    async init() {
      return (await send({ type: 'init' })) as number;
    },
    async search(query: string) {
      return (await send({ query, type: 'search' })) as SearchHit[];
    },
  };
}

function renderSearchEmpty(target: HTMLElement, message: string): void {
  const empty = document.createElement('p');
  empty.className = 'ws-search__empty';
  empty.textContent = message;
  target.replaceChildren(empty);
}

function renderSearchResults(target: HTMLElement, hits: SearchHit[]): void {
  if (hits.length === 0) {
    renderSearchEmpty(target, 'no matches');
    return;
  }

  target.replaceChildren(
    ...hits.map((hit) => {
      const link = document.createElement('a');
      link.className = 'ws-search__result';
      link.href = hit.url;

      const kind = document.createElement('span');
      kind.className = 'ws-search__kind';
      kind.textContent = hit.kind;

      const title = document.createElement('span');
      title.className = 'ws-search__title';
      title.textContent = hit.title;

      const body = document.createElement('span');
      body.className = 'ws-search__body';
      body.textContent = hit.body;

      link.appendChild(kind);
      link.appendChild(title);
      link.appendChild(body);
      return link;
    }),
  );
}

function mountPaneNavigation(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-pane-link]')];
  const panes = [...document.querySelectorAll<HTMLElement>('[data-pane]')];
  if (links.length === 0 || panes.length === 0) return;

  const setActive = (id: string) => {
    for (const link of links) {
      link.setAttribute('aria-current', String(link.dataset.paneLink === id));
    }
  };

  const focusPaneHeading = (id: string) => {
    const pane = document.getElementById(id);
    const heading = pane?.querySelector<HTMLElement>('h2[tabindex="-1"], h3[tabindex="-1"]');
    heading?.focus({ preventScroll: true });
  };

  if (location.hash.length > 1) {
    const id = location.hash.slice(1);
    setActive(id);
    // Defer to next frame so the browser's own fragment-scroll completes first;
    // focusing earlier can race the scroll and leave the heading off-screen.
    requestAnimationFrame(() => focusPaneHeading(id));
  } else {
    setActive(panes[0]?.id ?? '');
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target instanceof HTMLElement) {
        setActive(visible.target.id);
      }
    },
    { rootMargin: '-24% 0px -58% 0px', threshold: [0.12, 0.4, 0.72] },
  );

  for (const pane of panes) observer.observe(pane);

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    setActive(id);
    // Mirror the initial-load deferral: focus after the browser's fragment-scroll
    // settles so the heading lands on-screen before screen readers announce it.
    requestAnimationFrame(() => focusPaneHeading(id));
  });
}

function isFormField(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
  );
}
