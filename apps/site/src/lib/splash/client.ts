import { resumeIndex, type ResumeIndexSection } from '$lib/data/portfolio';
import { initSplashField, type SplashFieldHandle } from './field';
import { createSplitController, PDF_URL } from './split-controller';

const THEME_STORAGE_KEY = 'yanai-sh:theme';
const THEME_COLORS = {
  dark: '#151B22',
  light: '#F5F7FA',
} as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: 'dark' | 'light';
      callback: () => void;
      'expired-callback': () => void;
    },
  ) => void;
  getResponse: () => string;
  reset: () => void;
};

function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function preferredTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

function initTheme(onThemeChange?: () => void): void {
  const applyTheme = (theme: 'dark' | 'light'): void => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }

    const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
    toggle?.setAttribute('aria-pressed', String(theme === 'light'));

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute('content', THEME_COLORS[theme]);
    onThemeChange?.();
  };

  applyTheme(preferredTheme());

  document.querySelector<HTMLButtonElement>('.theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
}

function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const submitButton = document.getElementById('cf-submit') as HTMLButtonElement | null;
  const statusElement = document.getElementById('cf-status') as HTMLElement | null;
  if (!form || !submitButton || !statusElement) return;

  const siteKey = form.dataset.sitekey;
  if (!siteKey) return;

  const submit = submitButton;
  const status = statusElement;
  const turnstileWindow = window as Window & { turnstile?: TurnstileApi };

  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    const widgetElement = document.getElementById('cf-turnstile-widget') as HTMLElement | null;
    if (!widgetElement) return;
    turnstileWindow.turnstile?.render(widgetElement, {
      sitekey: siteKey,
      theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      callback: () => {
        submit.disabled = false;
      },
      'expired-callback': () => {
        submit.disabled = true;
      },
    });
  };
  document.head.appendChild(script);

  function setStatus(message: string, state: 'idle' | 'loading' | 'success' | 'error'): void {
    status.textContent = message;
    status.dataset.state = state;
    submit.disabled = state === 'loading';
  }

  const nameInput = form.elements.namedItem('name') as HTMLInputElement;
  const emailInput = form.elements.namedItem('email') as HTMLInputElement;
  const messageInput = form.elements.namedItem('message') as HTMLTextAreaElement;

  const emailValid = (): boolean => EMAIL_RE.test(emailInput.value.trim());

  emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim() && !emailValid()) {
      emailInput.setAttribute('aria-invalid', 'true');
      setStatus(form.dataset.statusInvalidEmail as string, 'error');
    }
  });

  for (const input of [nameInput, emailInput, messageInput]) {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      if (status.dataset.state === 'error') setStatus('', 'idle');
    });
  }

  // Submission is handled by the SvelteKit form action + `use:enhance` in
  // +page.svelte; this only wires Turnstile and inline field validation.
}

function initSplashFieldLayer(
  reducedMotion: boolean,
  onReady: (handle: SplashFieldHandle | null) => void,
): void {
  const layer = document.querySelector<HTMLElement>('[data-splash-field]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-splash-field-canvas]');
  if (!layer || !canvas) {
    onReady(null);
    return;
  }

  const start = (): void => {
    const handle = initSplashField(canvas, layer, { reducedMotion });
    onReady(handle);
    if (handle) {
      window.addEventListener('pagehide', () => handle.dispose(), { once: true });
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 900 });
  } else {
    globalThis.setTimeout(start, 120);
  }
}

function sectionMatches(section: ResumeIndexSection, query: string): boolean {
  if (!query) return true;
  const haystack = [section.label, ...section.keywords].join(' ').toLowerCase();
  return haystack.includes(query);
}

function jumpPdfToSection(pdfFrame: HTMLIFrameElement, section: ResumeIndexSection): void {
  const term = encodeURIComponent(section.label);
  pdfFrame.src = `${PDF_URL}#search=${term}`;
}

function initResumeNav(pdfFrame: HTMLIFrameElement): void {
  const filterInput = document.getElementById('resume-filter') as HTMLInputElement | null;
  const toc = document.getElementById('resume-toc');
  const emptyMessage = document.querySelector<HTMLElement>('.resume-nav__empty');
  if (!filterInput || !toc) return;

  const items = [...toc.querySelectorAll<HTMLButtonElement>('[data-resume-section]')];

  const applyFilter = (): void => {
    const query = filterInput.value.trim().toLowerCase();
    let firstVisible: HTMLButtonElement | null = null;
    for (const item of items) {
      const id = item.dataset.resumeSection ?? '';
      const section = resumeIndex.find((entry) => entry.id === id);
      const match = section ? sectionMatches(section, query) : false;
      item.hidden = !match;
      item.classList.toggle('is-match', match && query.length > 0);
      if (match && !firstVisible) firstVisible = item;
    }
    toc.dataset.empty = query && !firstVisible ? 'true' : 'false';
    if (emptyMessage) emptyMessage.hidden = !(query && !firstVisible);
  };

  filterInput.addEventListener('input', applyFilter);

  for (const item of items) {
    item.addEventListener('click', () => {
      const id = item.dataset.resumeSection ?? '';
      const section = resumeIndex.find((entry) => entry.id === id);
      if (!section) return;
      jumpPdfToSection(pdfFrame, section);
      for (const peer of items) peer.classList.remove('is-active');
      item.classList.add('is-active');
    });
  }
}

function initMagneticGlyphs(): void {
  if (prefersReducedMotion() || matchMedia('(pointer: coarse)').matches) return;
  const group = document.querySelector<HTMLElement>('[data-magnetic-group]');
  if (!group) return;
  const targets = [...group.querySelectorAll<HTMLElement>('a, button')];
  let raf = 0;

  const reset = (): void => {
    for (const target of targets) target.style.transform = '';
  };

  group.addEventListener('pointermove', (event) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const distance = Math.hypot(dx, dy);
        if (distance < 48) {
          const pull = (1 - distance / 48) * 3;
          target.style.transform = `translate(${(dx / distance) * pull || 0}px, ${(dy / distance) * pull || 0}px)`;
        } else {
          target.style.transform = '';
        }
      }
    });
  });
  group.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    reset();
  });
}

export function initSplash(): void {
  const reducedMotion = prefersReducedMotion();
  const root = document.documentElement;
  const shell = document.getElementById('shell');
  const paneDetail = document.getElementById('pane-detail');
  const splitDivider = document.getElementById('split-divider');
  const viewResume = document.getElementById('view-resume');
  const viewContact = document.getElementById('view-contact');
  const viewProject = document.getElementById('view-project');
  const chromeLabel = document.getElementById('chrome-label');
  const chromeSub = document.getElementById('chrome-sub');
  const chromeResumeActions = document.getElementById('chrome-resume-actions');
  const chromeProjectActions = document.getElementById('chrome-project-actions');
  const projectSource = document.getElementById('project-source') as HTMLAnchorElement | null;
  const pdfFrame = document.getElementById('resume-pdf') as HTMLIFrameElement | null;
  const pdfFallback = document.getElementById('pdf-fallback');
  const pdfOpen = document.getElementById('pdf-open') as HTMLAnchorElement | null;
  const pdfDownload = document.getElementById('pdf-download') as HTMLAnchorElement | null;
  const pdfFallbackLink = document.getElementById('pdf-fallback-link') as HTMLAnchorElement | null;
  const contactForm = document.getElementById('contact-form');

  if (
    !shell ||
    !paneDetail ||
    !splitDivider ||
    !viewResume ||
    !viewContact ||
    !viewProject ||
    !chromeLabel ||
    !chromeSub ||
    !chromeResumeActions ||
    !chromeProjectActions ||
    !pdfFrame ||
    !pdfFallback ||
    !pdfOpen ||
    !pdfDownload ||
    !pdfFallbackLink
  ) {
    return;
  }

  pdfOpen.href = PDF_URL;
  pdfDownload.href = PDF_URL;
  pdfFallbackLink.href = PDF_URL;

  const split = createSplitController({
    elements: {
      root,
      shell,
      paneDetail,
      splitDivider: splitDivider as HTMLButtonElement,
      viewResume,
      viewContact,
      viewProject,
      chromeLabel,
      chromeSub,
      chromeResumeActions,
      chromeProjectActions,
      projectSource,
      pdfFrame,
      pdfFallback,
    },
    reducedMotion,
    easeOutQuint,
  });

  split.bindSplitDivider();
  initResumeNav(pdfFrame);

  for (const element of document.querySelectorAll<HTMLElement>('[data-open-split]')) {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      const pane = element.getAttribute('data-open-split');
      if (pane === 'resume' || pane === 'contact') split.openSplit(pane);
    });
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-open-project]')) {
    const slug = element.getAttribute('data-open-project') ?? '';
    element.addEventListener('click', (event) => {
      event.preventDefault();
      if (slug) split.openSplit('project', { slug });
    });
  }
  for (const element of document.querySelectorAll('[data-close-split]')) {
    element.addEventListener('click', () => split.closeSplit());
  }

  if (contactForm instanceof HTMLFormElement && !contactForm.dataset.sitekey) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      contactForm.reportValidity();
    });
  }

  window.addEventListener('keydown', (event) => {
    if (
      event.key.toLowerCase() === 'c' &&
      !event.metaKey &&
      !event.ctrlKey &&
      split.getMode() === 'splash'
    ) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        event.preventDefault();
        split.openSplit('contact');
      }
    }
    if (event.key === 'Escape' && split.getMode() !== 'splash') split.closeSplit();
  });

  split.applyInitialHash();

  let splashField: SplashFieldHandle | null = null;
  initTheme(() => splashField?.syncTheme());
  initContactForm();
  initMagneticGlyphs();
  initSplashFieldLayer(reducedMotion, (handle) => {
    splashField = handle;
    // The field may initialize after the theme was applied (deferred via
    // requestIdleCallback); re-sync so a direct light-mode load matches.
    handle?.syncTheme();
  });
}
