const THEME_STORAGE_KEY = 'yanai-sh:theme';
const THEME_COLORS = {
  dark: '#151B22',
  light: '#F5F7FA',
} as const;

type CanvasWasmModule = {
  default: (moduleOrPath?: string | URL | Request) => Promise<unknown>;
  SystemsFieldRenderer: new (
    canvas: HTMLCanvasElement,
    seed: number,
    quality: number,
  ) => SystemsFieldRenderer;
};

type SystemsFieldMetrics = {
  quality: number;
  dpr: number;
  nodeCount: number;
  renderMs: number;
  theme: number;
  pagePhase: number;
};

type SystemsFieldRenderer = {
  resize(width: number, height: number, dpr: number): void;
  set_pointer(x: number, y: number): void;
  set_theme(theme: number): void;
  set_page_phase(phase: number): void;
  render(timeMs: number): number;
  metrics(): SystemsFieldMetrics;
  dispose(): void;
};

const THEME_RENDER_ID = {
  dark: 0,
  light: 1,
} as const;

const PAGE_PHASE = {
  home: 0,
  career: 1,
  projects: 2,
  contact: 3,
} as const;

function preferredTheme(): 'dark' | 'light' {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark';
}

function setTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
  toggle?.setAttribute('aria-pressed', String(theme === 'light'));

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute('content', THEME_COLORS[theme]);
  document.dispatchEvent(new CustomEvent('portfolio:theme-change', { detail: { theme } }));
}

function initTheme(): void {
  setTheme(preferredTheme());

  document.querySelector<HTMLButtonElement>('.theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  });
}

function initNav(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.site-nav a[href^="#"]'));
  const sections = links
    .map((link) => {
      const id = link.hash.slice(1);
      const section = document.getElementById(id);
      return section ? { id, link, section } : null;
    })
    .filter(
      (item): item is { id: string; link: HTMLAnchorElement; section: HTMLElement } =>
        item !== null,
    );

  const setActive = (id: string): void => {
    for (const item of sections) {
      item.link.classList.toggle('is-active', item.id === id);
    }
  };

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', link.hash);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target.id) setActive(visible.target.id);
    },
    {
      rootMargin: '-18% 0px -55% 0px',
      threshold: [0.15, 0.3, 0.6],
    },
  );

  for (const item of sections) observer.observe(item.section);
  setActive(sections[0]?.id ?? 'home');
}

function initTopButton(): void {
  const button = document.querySelector<HTMLButtonElement>('#to-top');
  if (!button) return;

  const update = (): void => {
    button.classList.toggle('is-visible', scrollY > innerHeight * 0.65);
  };

  button.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: 'smooth' });
  });
  addEventListener('scroll', update, { passive: true });
  update();
}

function idle(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 900 });
    return;
  }

  setTimeout(callback, 180);
}

function shouldSkipSystemsField(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function qualityTier(): number {
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const narrowViewport = matchMedia('(max-width: 720px)').matches;
  if (coarsePointer || narrowViewport) return 1;
  if (innerWidth >= 1280 && navigator.hardwareConcurrency >= 8) return 3;
  if (innerWidth >= 900 && navigator.hardwareConcurrency >= 4) return 2;
  return 1;
}

function initSystemsField(): void {
  const layer = document.querySelector<HTMLElement>('[data-systems-field-layer]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-systems-field-canvas]');
  if (!layer || !canvas || shouldSkipSystemsField()) return;

  idle(() => {
    void runSystemsField(layer, canvas);
  });
}

function sectionPhase(id: string): number {
  return PAGE_PHASE[id as keyof typeof PAGE_PHASE] ?? PAGE_PHASE.home;
}

function currentThemeId(): number {
  return document.documentElement.dataset.theme === 'light'
    ? THEME_RENDER_ID.light
    : THEME_RENDER_ID.dark;
}

function shouldShowSystemsFieldDebug(): boolean {
  return new URLSearchParams(location.search).has('wasmDebug');
}

function createSystemsFieldDebug(): HTMLElement {
  const element = document.createElement('div');
  element.className = 'systems-field-debug';
  element.hidden = true;
  document.body.appendChild(element);
  return element;
}

function updateSystemsFieldDebug(
  element: HTMLElement,
  metrics: SystemsFieldMetrics,
  fps: number,
): void {
  element.hidden = false;
  element.textContent = [
    `fps ${fps.toFixed(0)}`,
    `q${metrics.quality} dpr ${metrics.dpr.toFixed(2)}`,
    `nodes ${metrics.nodeCount}`,
    `render ${metrics.renderMs.toFixed(2)}ms`,
    `theme ${metrics.theme.toFixed(2)}`,
    `phase ${metrics.pagePhase.toFixed(2)}`,
  ].join('\n');
}

async function runSystemsField(layer: HTMLElement, canvas: HTMLCanvasElement): Promise<void> {
  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', window.location.href).href;
    const wasm = (await import(/* @vite-ignore */ moduleUrl)) as CanvasWasmModule;
    await wasm.default();

    const pointer = { x: 0.5, y: 0.42 };
    const quality = qualityTier();
    const renderer = new wasm.SystemsFieldRenderer(canvas, 0x51e7_2026, quality);
    const debug = shouldShowSystemsFieldDebug() ? createSystemsFieldDebug() : null;
    let visible = true;
    let frame = 0;
    let raf = 0;
    let lastFpsTime = performance.now();
    let fpsFrameCount = 0;
    let fps = 0;

    const updatePointer = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.y = (event.clientY - rect.top) / Math.max(rect.height, 1);
      renderer.set_pointer(pointer.x, pointer.y);
    };

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.resize(rect.width, rect.height, Math.min(devicePixelRatio || 1, 1.75));
    };

    const render = (timeMs: number): void => {
      if (!visible || document.visibilityState !== 'visible') {
        raf = requestAnimationFrame(render);
        return;
      }

      frame += 1;
      if (quality > 1 || frame % 2 === 0) {
        resize();
        renderer.render(timeMs);
        fpsFrameCount += 1;
        if (timeMs - lastFpsTime >= 500) {
          fps = (fpsFrameCount * 1000) / (timeMs - lastFpsTime);
          fpsFrameCount = 0;
          lastFpsTime = timeMs;
        }
        if (debug) {
          updateSystemsFieldDebug(debug, renderer.metrics(), fps);
        }
      }

      raf = requestAnimationFrame(render);
    };

    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.01 },
    );

    const phaseObserver = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (active?.target.id) renderer.set_page_phase(sectionPhase(active.target.id));
      },
      { rootMargin: '-20% 0px -35% 0px', threshold: [0.12, 0.28, 0.5, 0.72] },
    );

    addEventListener('pointermove', updatePointer, { passive: true });
    addEventListener('resize', resize, { passive: true });
    visibility.observe(document.body);
    for (const section of document.querySelectorAll<HTMLElement>('main section[id]')) {
      phaseObserver.observe(section);
    }

    const renderCurrentTheme = (): void => {
      renderer.set_theme(currentThemeId());
      resize();
      renderer.render(performance.now());
    };
    const handleThemeChange = (): void => renderCurrentTheme();

    renderer.set_theme(currentThemeId());
    renderer.set_page_phase(PAGE_PHASE.home);
    renderer.set_pointer(pointer.x, pointer.y);
    resize();
    renderer.render(0);
    layer.classList.add('is-systems-field-ready');
    raf = requestAnimationFrame(render);
    document.addEventListener('portfolio:theme-change', handleThemeChange);

    addEventListener(
      'pagehide',
      () => {
        cancelAnimationFrame(raf);
        visibility.disconnect();
        phaseObserver.disconnect();
        removeEventListener('pointermove', updatePointer);
        removeEventListener('resize', resize);
        document.removeEventListener('portfolio:theme-change', handleThemeChange);
        renderer.dispose();
        debug?.remove();
      },
      { once: true },
    );
  } catch (error) {
    console.warn('systems field unavailable', error);
  }
}

initTheme();
initNav();
initTopButton();
initSystemsField();
