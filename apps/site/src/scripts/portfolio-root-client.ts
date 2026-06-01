const THEME_STORAGE_KEY = 'yanai-sh:theme';
const THEME_COLORS = {
  dark: '#151B22',
  light: '#F5F7FA',
} as const;

type CanvasWasmModule = {
  default: (moduleOrPath?: string | URL | Request) => Promise<unknown>;
  render_systems_field: (
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    pointerXNorm: number,
    pointerYNorm: number,
    timeMs: number,
    renderOptions: number,
  ) => number;
};

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
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const narrowViewport = matchMedia('(max-width: 720px)').matches;
  return reducedMotion || coarsePointer || narrowViewport;
}

function qualityTier(): number {
  if (innerWidth >= 1280 && navigator.hardwareConcurrency >= 8) return 3;
  if (innerWidth >= 900 && navigator.hardwareConcurrency >= 4) return 2;
  return 1;
}

function renderOptions(quality: number): number {
  const lightMode = document.documentElement.dataset.theme === 'light';
  return quality | (lightMode ? 0b100 : 0);
}

function initSystemsField(): void {
  const hero = document.querySelector<HTMLElement>('[data-systems-hero]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-systems-field-canvas]');
  if (!hero || !canvas || shouldSkipSystemsField()) return;

  let mounted = false;

  const mount = (): void => {
    if (mounted) return;
    mounted = true;

    idle(() => {
      void runSystemsField(hero, canvas);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        mount();
        observer.disconnect();
      }
    },
    { rootMargin: '160px 0px', threshold: 0.01 },
  );

  observer.observe(hero);
}

async function runSystemsField(hero: HTMLElement, canvas: HTMLCanvasElement): Promise<void> {
  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', window.location.href).href;
    const wasm = (await import(/* @vite-ignore */ moduleUrl)) as CanvasWasmModule;
    await wasm.default();

    const pointer = { x: 0.5, y: 0.42 };
    const quality = qualityTier();
    let visible = true;
    let frame = 0;
    let raf = 0;

    const updatePointer = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.y = (event.clientY - rect.top) / Math.max(rect.height, 1);
    };

    const render = (timeMs: number): void => {
      if (!visible || document.visibilityState !== 'visible') {
        raf = requestAnimationFrame(render);
        return;
      }

      frame += 1;
      if (quality > 1 || frame % 2 === 0) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          wasm.render_systems_field(
            canvas,
            rect.width,
            rect.height,
            pointer.x,
            pointer.y,
            timeMs,
            renderOptions(quality),
          );
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

    hero.addEventListener('pointermove', updatePointer, { passive: true });
    visibility.observe(hero);

    const renderCurrentTheme = (timeMs = performance.now()): void => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      wasm.render_systems_field(
        canvas,
        rect.width,
        rect.height,
        pointer.x,
        pointer.y,
        timeMs,
        renderOptions(quality),
      );
    };
    const handleThemeChange = (): void => renderCurrentTheme();

    renderCurrentTheme(0);
    hero.classList.add('is-systems-field-ready');
    raf = requestAnimationFrame(render);
    document.addEventListener('portfolio:theme-change', handleThemeChange);

    addEventListener(
      'pagehide',
      () => {
        cancelAnimationFrame(raf);
        visibility.disconnect();
        hero.removeEventListener('pointermove', updatePointer);
        document.removeEventListener('portfolio:theme-change', handleThemeChange);
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
