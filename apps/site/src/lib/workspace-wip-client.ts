import type { SearchHit } from '@lib/search-client';
import { createSharedState } from '@lib/shared-state';

interface CanvasModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  render_lattice(canvas: HTMLCanvasElement, width: number, height: number): number;
}

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

export function mountWorkspaceWip(): void {
  const targets: StatusTargets = {
    wasm: document.querySelector('[data-wip-status="wasm"]'),
    sab: document.querySelector('[data-wip-status="sab"]'),
    canvas: document.querySelector('[data-wip-status="canvas"]'),
    search: document.querySelector('[data-wip-status="search"]'),
  };

  void mountSharedState(targets);
  mountCanvas(targets);
  mountSearch(targets);
  mountPaneNavigation();
}

function setStatus(target: HTMLElement | null, state: keyof typeof statusText): void {
  if (!target) return;
  target.dataset.state = state;
  const value = target.querySelector<HTMLElement>('[data-wip-value]');
  if (value) value.textContent = statusText[state];
}

async function mountSharedState(targets: StatusTargets): Promise<void> {
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
  } catch {
    setStatus(targets.sab, 'off');
  }
}

async function mountCanvas(targets: StatusTargets): Promise<void> {
  const canvas = document.getElementById('ws-rust-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', globalThis.location.href).href;
    const mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as CanvasModule;
    await mod.default();
    setStatus(targets.wasm, 'ready');

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      mod.render_lattice(
        canvas,
        rect.width || window.innerWidth,
        rect.height || window.innerHeight,
      );
      setStatus(targets.canvas, 'ready');
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', draw, { passive: true });
  } catch (error) {
    console.error(error);
    setStatus(targets.wasm, 'error');
    setStatus(targets.canvas, 'error');
  }
}

function mountSearch(targets: StatusTargets): void {
  const trigger = document.getElementById('ws-search-trigger');
  const closeButton = document.getElementById('ws-search-close');
  const panel = document.getElementById('ws-search-panel');
  const input = document.getElementById('ws-search-input');
  const results = document.getElementById('ws-search-results');

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
    const heading = pane?.querySelector<HTMLElement>('h2[tabindex="-1"]');
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
