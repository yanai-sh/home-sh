import { errorMessage } from '$lib/contact-error-codes';

const CONTACT_ENDPOINT = '/api/contact';
const SPLIT_OPEN_MS = 780;
const SPLIT_CLOSE_MS = 620;
const BOOT_PROGRESS_MS = 1500;
const REVEAL_MS = 600;
const FORM_SUCCESS_MS = 1200;
const FORM_ERROR_MS = 400;
const IDLE_AFTER_MS = 4000;
const IDLE_FRAME_STRIDE = 6;
const MESSAGE_INTENSITY_CAP = 800;
const SPLIT_RATIO_KEY = 'yanai-sh:split-ratio';
const THEME_STORAGE_KEY = 'yanai-sh:theme';
const THEME_COLORS = {
  dark: '#151B22',
  light: '#F5F7FA',
} as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FORM_IDLE = 0;
const FORM_FOCUS = 1;
const FORM_SENDING = 2;
const FORM_SUCCESS = 3;
const FORM_ERROR = 4;

const DOC_NONE = 0;
const DOC_LOADING = 1;
const DOC_READY = 2;
const DOC_ERROR = 3;

type SiteMode = 'splash' | 'resume' | 'contact' | 'project';
type DetailPane = Exclude<SiteMode, 'splash'>;

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
  set_split_progress?(progress: number): void;
  set_split_target?(target: number): void;
  set_boot_progress?(progress: number): void;
  set_focus?(x: number, y: number, strength: number): void;
  set_form_state?(state: number): void;
  set_form_intensity?(intensity: number): void;
  set_doc_state?(state: number): void;
  set_reveal?(progress: number): void;
  render(timeMs: number): number;
  metrics(): SystemsFieldMetrics;
  dispose(): void;
};

type FieldBridge = {
  formState: (state: number) => void;
  formIntensity: (intensity: number) => void;
  formErrorFlash: () => void;
  formSuccess: () => void;
  docState: (state: number) => void;
  reveal: (progress: number) => void;
  animateReveal: () => void;
  resetActivity: () => void;
  pulseDivider: () => void;
};

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

const PAGE_PHASE = {
  home: 0,
  career: 1,
  contact: 3,
} as const;

function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

function modePhase(mode: SiteMode): number {
  if (mode === 'contact') return PAGE_PHASE.contact;
  if (mode === 'resume') return PAGE_PHASE.career;
  return PAGE_PHASE.home;
}

function splitTargetId(mode: SiteMode): number {
  return mode === 'contact' ? 1 : 0;
}

function themeRenderId(): number {
  return document.documentElement.dataset.theme === 'light' ? 1 : 0;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fieldPointFor(seed: string): { x: number; y: number } {
  const hash = hashString(seed);
  return {
    x: 0.2 + ((hash % 61) / 61) * 0.6,
    y: 0.24 + (((hash >>> 8) % 47) / 47) * 0.5,
  };
}

function prefersReducedMotion(): boolean {
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

function idle(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 900 });
    return;
  }
  setTimeout(callback, 180);
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

function createFieldBridge(getRenderer: () => SystemsFieldRenderer | null): FieldBridge {
  let formResetTimer = 0;
  let revealRaf = 0;

  const formState = (state: number): void => {
    getRenderer()?.set_form_state?.(state);
    markFieldActivity();
  };

  const formIntensity = (intensity: number): void => {
    getRenderer()?.set_form_intensity?.(intensity);
    markFieldActivity();
  };

  const formErrorFlash = (): void => {
    clearTimeout(formResetTimer);
    formState(FORM_ERROR);
    formResetTimer = window.setTimeout(() => {
      formState(FORM_IDLE);
      formIntensity(0);
    }, FORM_ERROR_MS);
  };

  const formSuccess = (): void => {
    clearTimeout(formResetTimer);
    formState(FORM_SUCCESS);
    formIntensity(0);
    formResetTimer = window.setTimeout(() => formState(FORM_IDLE), FORM_SUCCESS_MS);
  };

  const docState = (state: number): void => {
    getRenderer()?.set_doc_state?.(state);
    markFieldActivity();
  };

  const reveal = (progress: number): void => {
    getRenderer()?.set_reveal?.(progress);
    markFieldActivity();
  };

  const animateReveal = (): void => {
    if (prefersReducedMotion()) {
      reveal(1);
      return;
    }
    cancelAnimationFrame(revealRaf);
    const started = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - started) / REVEAL_MS);
      reveal(easeOutQuint(t));
      if (t < 1) {
        revealRaf = requestAnimationFrame(tick);
      }
    };
    reveal(0);
    revealRaf = requestAnimationFrame(tick);
  };

  const resetActivity = (): void => {
    clearTimeout(formResetTimer);
    cancelAnimationFrame(revealRaf);
    formState(FORM_IDLE);
    formIntensity(0);
    docState(DOC_NONE);
    reveal(0);
  };

  const pulseDivider = (): void => {
    const r = getRenderer();
    if (!r?.set_focus) return;
    r.set_focus(0.42, 0.5, 0.85);
    markFieldActivity();
    window.setTimeout(() => r.set_focus?.(0.5, 0.42, 0), 280);
  };

  return {
    formState,
    formIntensity,
    formErrorFlash,
    formSuccess,
    docState,
    reveal,
    animateReveal,
    resetActivity,
    pulseDivider,
  };
}

function initTheme(onThemeChange?: (theme: 'dark' | 'light') => void): void {
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
    onThemeChange?.(theme);
  };

  applyTheme(preferredTheme());

  document.querySelector<HTMLButtonElement>('.theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
}

function initContactForm(field: FieldBridge): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const submitButton = document.getElementById('cf-submit') as HTMLButtonElement | null;
  const statusElement = document.getElementById('cf-status') as HTMLElement | null;
  const widgetElement = document.getElementById('cf-turnstile-widget') as HTMLElement | null;
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

  const syncMessageIntensity = (): void => {
    const len = messageInput.value.length;
    field.formIntensity(Math.min(len / MESSAGE_INTENSITY_CAP, 1));
  };

  form.addEventListener(
    'focusin',
    (event) => {
      if ((event.target as HTMLElement).id === 'cf-message') {
        field.formState(FORM_FOCUS);
      }
    },
    true,
  );

  form.addEventListener(
    'focusout',
    () => {
      window.setTimeout(() => {
        if (!form.contains(document.activeElement)) {
          field.formState(FORM_IDLE);
          field.formIntensity(0);
        }
      }, 0);
    },
    true,
  );

  messageInput.addEventListener('input', syncMessageIntensity);

  emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim() && !emailValid()) {
      emailInput.setAttribute('aria-invalid', 'true');
      setStatus(form.dataset.statusInvalidEmail as string, 'error');
      field.formErrorFlash();
    }
  });

  for (const input of [nameInput, emailInput, messageInput]) {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      if (status.dataset.state === 'error') setStatus('', 'idle');
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
      setStatus(form.dataset.statusMissingFields as string, 'error');
      field.formErrorFlash();
      return;
    }
    if (!emailValid()) {
      emailInput.setAttribute('aria-invalid', 'true');
      setStatus(form.dataset.statusInvalidEmail as string, 'error');
      field.formErrorFlash();
      return;
    }

    const token = turnstileWindow.turnstile?.getResponse();
    if (!token) {
      setStatus(form.dataset.statusCaptcha as string, 'error');
      field.formErrorFlash();
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      message: messageInput.value.trim(),
      website: (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '',
      token,
    };

    setStatus(form.dataset.statusSending as string, 'loading');
    field.formState(FORM_SENDING);

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus(form.dataset.statusSent as string, 'success');
        form.reset();
        turnstileWindow.turnstile?.reset();
        submit.disabled = true;
        field.formSuccess();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(errorMessage(body.error ?? 'send_failed'), 'error');
      turnstileWindow.turnstile?.reset();
      submit.disabled = true;
      field.formErrorFlash();
    } catch {
      setStatus(form.dataset.statusNetworkError as string, 'error');
      field.formErrorFlash();
    }
  });
}

function updateCaptionWasmSize(): void {
  const slot = document.querySelector<HTMLElement>('[data-caption-wasm]');
  if (!slot) return;
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const wasmEntry = entries.find((entry) => entry.name.includes('canvas_bg.wasm'));
  if (!wasmEntry) return;
  const bytes = wasmEntry.transferSize || wasmEntry.encodedBodySize;
  if (!bytes) return;
  slot.textContent = `wasm ${Math.round(bytes / 1024)} kB`;
  slot.hidden = false;
}

function updateCaptionFps(fps: number): void {
  const slot = document.querySelector<HTMLElement>('[data-caption-fps]');
  if (!slot) return;
  slot.textContent = `${fps} fps`;
  slot.hidden = false;
}

function initSystemsField(onReady: (renderer: SystemsFieldRenderer) => void): void {
  const layer = document.querySelector<HTMLElement>('[data-systems-field-layer]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-systems-field-canvas]');
  if (!layer || !canvas) return;

  const hour = new Date().getHours();
  const hueShift = Math.round(Math.sin((hour / 24) * Math.PI * 2) * 10);
  layer.style.setProperty('--field-hue', `${hueShift}deg`);

  idle(() => {
    void runSystemsField(layer, canvas, onReady);
  });
}

function animateBootProgress(renderer: SystemsFieldRenderer, reducedMotion: boolean): void {
  if (!renderer.set_boot_progress) {
    return;
  }
  if (reducedMotion) {
    renderer.set_boot_progress(1);
    return;
  }

  const started = performance.now();
  const tick = (now: number): void => {
    const t = Math.min(1, (now - started) / BOOT_PROGRESS_MS);
    renderer.set_boot_progress?.(easeOutQuint(t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let markFieldActivity: () => void = () => {};

async function runSystemsField(
  layer: HTMLElement,
  canvas: HTMLCanvasElement,
  onReady: (renderer: SystemsFieldRenderer) => void,
): Promise<void> {
  const wasmStarted = performance.now();
  const reducedMotion = prefersReducedMotion();
  try {
    const moduleUrl = new URL('/wasm/canvas/canvas.js', window.location.href).href;
    const wasm = (await import(/* @vite-ignore */ moduleUrl)) as CanvasWasmModule;
    await wasm.default();

    const pointer = { x: 0.5, y: 0.42 };
    const quality = qualityTier();
    const renderer = new wasm.SystemsFieldRenderer(canvas, 0x51e7_2026, quality);

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.resize(rect.width, rect.height, Math.min(devicePixelRatio || 1, 1.75));
    };

    renderer.set_theme(themeRenderId());
    renderer.set_page_phase(PAGE_PHASE.home);
    renderer.set_pointer(pointer.x, pointer.y);
    renderer.set_split_progress?.(0);
    renderer.set_split_target?.(0);
    renderer.set_form_state?.(FORM_IDLE);
    renderer.set_form_intensity?.(0);
    renderer.set_doc_state?.(DOC_NONE);
    renderer.set_reveal?.(0);
    resize();
    renderer.render(0);
    layer.classList.add('is-systems-field-ready');

    window.dispatchEvent(
      new CustomEvent('telemetry:wasm-ready', {
        detail: { ms: performance.now() - wasmStarted },
      }),
    );
    updateCaptionWasmSize();

    if (reducedMotion) {
      renderer.set_boot_progress?.(1);
      renderer.render(0);
      const renderOnce = (): void => {
        resize();
        renderer.render(performance.now());
      };
      markFieldActivity = renderOnce;
      addEventListener('resize', renderOnce, { passive: true });
      onReady(renderer);
      addEventListener(
        'pagehide',
        () => {
          removeEventListener('resize', renderOnce);
          renderer.dispose();
        },
        { once: true },
      );
      return;
    }

    let visible = true;
    let frame = 0;
    let raf = 0;
    let lastActivityAt = performance.now();
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();

    markFieldActivity = () => {
      lastActivityAt = performance.now();
    };

    const updatePointer = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.y = (event.clientY - rect.top) / Math.max(rect.height, 1);
      renderer.set_pointer(pointer.x, pointer.y);
      lastActivityAt = performance.now();
    };

    const render = (timeMs: number): void => {
      if (!visible || document.visibilityState !== 'visible') {
        raf = requestAnimationFrame(render);
        return;
      }

      frame += 1;
      const isIdle = timeMs - lastActivityAt > IDLE_AFTER_MS;
      const stride = isIdle ? IDLE_FRAME_STRIDE : quality > 1 ? 1 : 2;
      if (frame % stride === 0) {
        resize();
        renderer.render(timeMs);
        fpsFrames += 1;
      }

      const fpsElapsed = timeMs - fpsWindowStart;
      if (fpsElapsed >= 1000) {
        updateCaptionFps(Math.round((fpsFrames * 1000) / fpsElapsed));
        fpsFrames = 0;
        fpsWindowStart = timeMs;
      }

      raf = requestAnimationFrame(render);
    };

    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.01 },
    );

    addEventListener('pointermove', updatePointer, { passive: true });
    addEventListener('keydown', markFieldActivity, { passive: true });
    addEventListener('resize', resize, { passive: true });
    visibility.observe(document.body);

    onReady(renderer);
    raf = requestAnimationFrame(render);

    addEventListener(
      'pagehide',
      () => {
        cancelAnimationFrame(raf);
        visibility.disconnect();
        removeEventListener('pointermove', updatePointer);
        removeEventListener('keydown', markFieldActivity);
        removeEventListener('resize', resize);
        renderer.dispose();
      },
      { once: true },
    );
  } catch (error) {
    console.warn('systems field unavailable', error);
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

  const PDF_URL = '/resume.pdf';
  pdfOpen.href = PDF_URL;
  pdfDownload.href = PDF_URL;
  pdfFallbackLink.href = PDF_URL;

  let mode: SiteMode = 'splash';
  let activeProject = '';
  let splitProgress = 0;
  let pdfLoaded = false;
  let dragging = false;
  let customSplitRatio: number | null = null;
  let renderer: SystemsFieldRenderer | null = null;
  let focusRestore = 0;

  const field = createFieldBridge(() => renderer);

  try {
    const savedRatio = Number(localStorage.getItem(SPLIT_RATIO_KEY));
    if (Number.isFinite(savedRatio) && savedRatio >= 22 && savedRatio <= 68) {
      customSplitRatio = savedRatio;
    }
  } catch {
    // ignore
  }

  const pulseFocus = (x: number, y: number, strength: number): void => {
    renderer?.set_focus?.(x, y, strength);
    markFieldActivity();
    clearTimeout(focusRestore);
    focusRestore = window.setTimeout(() => {
      renderer?.set_focus?.(0.5, 0.42, 0);
    }, 320);
  };

  const persistSplitRatio = (): void => {
    try {
      if (customSplitRatio !== null) {
        localStorage.setItem(SPLIT_RATIO_KEY, String(customSplitRatio));
      }
    } catch {
      // ignore
    }
  };

  const setSplitProgress = (value: number): void => {
    splitProgress = Math.max(0, Math.min(1, value));
    root.style.setProperty('--split-progress', String(splitProgress));
    renderer?.set_split_progress?.(splitProgress);
    if (customSplitRatio !== null && splitProgress > 0) {
      shell.style.setProperty('--split-left', `${customSplitRatio}%`);
    } else if (splitProgress === 0) {
      shell.style.removeProperty('--split-left');
    }
  };

  const setMode = (next: SiteMode): void => {
    mode = next;
    root.dataset.siteMode = next;
    renderer?.set_page_phase(modePhase(next));
    renderer?.set_split_target?.(splitTargetId(next));
  };

  const animateSplit = (target: number, duration: number, onDone?: () => void): void => {
    markFieldActivity();
    if (reducedMotion || duration === 0) {
      setSplitProgress(target);
      markFieldActivity();
      onDone?.();
      return;
    }

    root.classList.add('is-split-animating');
    const start = performance.now();
    const from = splitProgress;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuint(t);
      const progress = from + (target - from) * eased;
      setSplitProgress(progress);
      markFieldActivity();
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      root.classList.remove('is-split-animating');
      onDone?.();
    };
    requestAnimationFrame(tick);
  };

  const showProjectDetail = (slug: string): { title: string; repo: string } | null => {
    let found: { title: string; repo: string } | null = null;
    for (const article of viewProject.querySelectorAll<HTMLElement>('[data-project-detail]')) {
      const isActive = article.dataset.projectDetail === slug;
      article.hidden = !isActive;
      if (isActive) {
        found = {
          title: article.dataset.projectTitle ?? slug,
          repo: article.dataset.projectRepo ?? '',
        };
      }
    }
    return found;
  };

  const showPaneView = (which: DetailPane, slug = ''): void => {
    viewResume.classList.toggle('is-active', which === 'resume');
    viewContact.classList.toggle('is-active', which === 'contact');
    viewProject.classList.toggle('is-active', which === 'project');
    chromeResumeActions.hidden = which !== 'resume';
    chromeProjectActions.hidden = which !== 'project';

    if (which === 'resume') {
      chromeLabel.textContent = 'resume.pdf';
      chromeSub.textContent = '';
    } else if (which === 'contact') {
      chromeLabel.textContent = 'contact';
      chromeSub.textContent = '· send a note';
    } else {
      const detail = showProjectDetail(slug);
      chromeLabel.textContent = detail?.title ?? slug;
      chromeSub.textContent = '';
      if (projectSource) {
        if (detail?.repo) {
          projectSource.href = detail.repo;
          projectSource.hidden = false;
        } else {
          projectSource.hidden = true;
        }
      }
    }
  };

  const ensurePdfLoaded = (): void => {
    if (pdfLoaded) return;
    pdfLoaded = true;
    field.docState(DOC_LOADING);
    pdfFrame.src = PDF_URL;
    pdfFrame.hidden = false;
    pdfFrame.addEventListener(
      'load',
      () => {
        field.docState(DOC_READY);
      },
      { once: true },
    );
    pdfFrame.addEventListener(
      'error',
      () => {
        pdfFrame.hidden = true;
        pdfFallback.classList.add('is-visible');
        field.docState(DOC_ERROR);
      },
      { once: true },
    );
  };

  const hashFor = (pane: DetailPane, slug: string): string => {
    if (pane === 'resume') return '#resume';
    if (pane === 'contact') return '#contact';
    return `#p/${slug}`;
  };

  const openSplit = (pane: DetailPane, options: { slug?: string } = {}): void => {
    const slug = options.slug ?? '';
    const alreadyOpen = mode === pane && (pane !== 'project' || activeProject === slug);
    if (alreadyOpen) return;

    const switching = mode !== 'splash';
    activeProject = pane === 'project' ? slug : '';
    setMode(pane);
    paneDetail.removeAttribute('inert');
    showPaneView(pane, slug);

    if (pane === 'resume') {
      ensurePdfLoaded();
    } else {
      field.docState(DOC_NONE);
    }

    history.replaceState(null, '', `${location.pathname}${hashFor(pane, slug)}`);

    if (switching) {
      field.animateReveal();
      if (pane === 'contact') document.getElementById('cf-name')?.focus();
      return;
    }

    field.animateReveal();
    animateSplit(1, reducedMotion ? 0 : SPLIT_OPEN_MS, () => {
      if (pane === 'contact') document.getElementById('cf-name')?.focus();
    });
  };

  const closeSplit = (): void => {
    if (mode === 'splash') return;
    animateSplit(0, reducedMotion ? 0 : SPLIT_CLOSE_MS, () => {
      paneDetail.setAttribute('inert', '');
      viewResume.classList.remove('is-active');
      viewContact.classList.remove('is-active');
      viewProject.classList.remove('is-active');
      setMode('splash');
      activeProject = '';
      chromeSub.textContent = '';
      field.resetActivity();
      history.replaceState(null, '', location.pathname);
      document.querySelector<HTMLElement>('#splash')?.focus();
    });
  };

  const setSplitFromPointer = (clientX: number): void => {
    const rect = shell.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    customSplitRatio = Math.min(68, Math.max(22, ratio));
    shell.style.setProperty('--split-left', `${customSplitRatio}%`);
  };

  splitDivider.addEventListener('pointerdown', (event) => {
    if (splitProgress < 0.05) return;
    dragging = true;
    splitDivider.classList.add('is-dragging');
    splitDivider.setPointerCapture(event.pointerId);
    setSplitFromPointer(event.clientX);
  });
  splitDivider.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    setSplitFromPointer(event.clientX);
  });
  splitDivider.addEventListener('pointerup', (event) => {
    dragging = false;
    splitDivider.classList.remove('is-dragging');
    splitDivider.releasePointerCapture(event.pointerId);
    persistSplitRatio();
  });
  splitDivider.addEventListener('dblclick', () => {
    customSplitRatio = null;
    shell.style.removeProperty('--split-left');
    try {
      localStorage.removeItem(SPLIT_RATIO_KEY);
    } catch {
      // ignore
    }
  });
  splitDivider.addEventListener('keydown', (event) => {
    if (splitProgress < 0.05) return;
    const current = customSplitRatio ?? 42;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      customSplitRatio = Math.max(22, current - 4);
      shell.style.setProperty('--split-left', `${customSplitRatio}%`);
      persistSplitRatio();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      customSplitRatio = Math.min(68, current + 4);
      shell.style.setProperty('--split-left', `${customSplitRatio}%`);
      persistSplitRatio();
    }
  });

  for (const element of document.querySelectorAll<HTMLElement>('[data-open-split]')) {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      const pane = element.getAttribute('data-open-split');
      if (pane === 'resume' || pane === 'contact') openSplit(pane);
    });
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-open-project]')) {
    const slug = element.getAttribute('data-open-project') ?? '';
    element.addEventListener('click', (event) => {
      event.preventDefault();
      if (slug) openSplit('project', { slug });
    });
    element.addEventListener('pointerenter', () => {
      if (reducedMotion) return;
      const point = fieldPointFor(slug);
      pulseFocus(point.x, point.y, 0.8);
    });
  }
  for (const element of document.querySelectorAll('[data-close-split]')) {
    element.addEventListener('click', closeSplit);
  }

  for (const element of [pdfOpen, pdfDownload]) {
    element.addEventListener('click', () => field.pulseDivider());
  }

  if (contactForm instanceof HTMLFormElement && !contactForm.dataset.sitekey) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      contactForm.reportValidity();
    });
  }

  addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey && mode === 'splash') {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        event.preventDefault();
        openSplit('contact');
      }
    }
    if (event.key === 'Escape' && mode !== 'splash') closeSplit();
  });

  if (location.hash === '#contact') openSplit('contact');
  else if (location.hash === '#resume') openSplit('resume');
  else if (location.hash.startsWith('#p/')) {
    const slug = location.hash.slice(3);
    if (slug) openSplit('project', { slug });
  }

  initTheme(() => {
    renderer?.set_theme(themeRenderId());
    if (reducedMotion && renderer) {
      for (let step = 0; step < 24; step += 1) renderer.render(performance.now());
    }
  });

  initContactForm(field);
  initMagneticGlyphs();
  initSystemsField((readyRenderer) => {
    renderer = readyRenderer;
    renderer.set_page_phase(modePhase(mode));
    renderer.set_split_progress?.(splitProgress);
    renderer.set_split_target?.(splitTargetId(mode));
    animateBootProgress(renderer, reducedMotion);
  });

}
