/**
 * Canvas 2D soft "ink in water" — large, blurred gradient blooms that drift
 * slowly and are stirred by the pointer. Pure 2D canvas (no WebGL/GPU) so it
 * renders identically on every browser. Smooth by construction (radial
 * gradients), so it stays calm and premium rather than busy.
 */

const POINTER_REST_X = 0.72;
const POINTER_REST_Y = 0.42;

export type SplashFieldHandle = {
  dispose: () => void;
  syncTheme: () => void;
};

type Rgb = [number, number, number];

const BLOOM_COUNT = 5;
const POINTER_LERP = 0.12;
const DRIFT_SPEED = 0.00007; // slow organic drift
const DRIFT_AMP = 0.07; // fraction of viewport the blooms wander
const POINTER_REPEL = 0.06; // how much ambient blooms shy from the cursor
const CURSOR_BLOOM_R = 0.3; // cursor glow radius (fraction of min viewport dim)
const CLICK_LIFE_MS = 2000;
const DROP_COUNT = 4;
// Keep the left calm behind the hero text; ink concentrates on the open right.
const EDGE_FADE_START = 0.04;
const EDGE_FADE_END = 0.5;

function parseHex(raw: string, fallback: Rgb): Rgb {
  const hex = raw.trim().replace('#', '');
  if (hex.length !== 6) return fallback;
  const n = Number.parseInt(hex, 16);
  if (Number.isNaN(n)) return fallback;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readRgb(varName: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw.startsWith('#') ? parseHex(raw, fallback) : fallback;
}

export function initSplashField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: { reducedMotion: boolean },
): SplashFieldHandle | null {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;

  let bg: Rgb = [21, 27, 34];
  let palette: Rgb[] = [
    [120, 164, 255],
    [118, 255, 213],
    [255, 205, 118],
  ];
  let isLight = false;

  const syncTheme = (): void => {
    bg = readRgb('--color-background', bg);
    palette = [
      readRgb('--color-accent-text', palette[0]),
      readRgb('--color-ok', palette[1]),
      readRgb('--color-accent-warm', palette[2]),
    ];
    isLight = document.documentElement.dataset.theme === 'light';
  };

  let width = 1;
  let height = 1;
  let minDim = 1;
  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    minDim = Math.min(width, height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  type Bloom = { bx: number; by: number; r: number; ci: number; phase: number; speed: number };
  const blooms: Bloom[] = [];
  for (let i = 0; i < BLOOM_COUNT; i++) {
    blooms.push({
      bx: 0.5 + Math.random() * 0.46, // right-leaning, away from the hero text
      by: 0.18 + Math.random() * 0.62,
      r: 0.34 + Math.random() * 0.22,
      ci: i % 3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.8,
    });
  }

  const pointer = { x: POINTER_REST_X, y: POINTER_REST_Y };
  const target = { ...pointer };
  const dropX = new Float64Array(DROP_COUNT);
  const dropY = new Float64Array(DROP_COUNT);
  const dropT0 = new Float64Array(DROP_COUNT);
  let dropCursor = 0;

  let raf = 0;
  let visible = true;
  let disposed = false;

  const edgeAlpha = (xFrac: number): number =>
    Math.max(0.14, Math.min(1, (xFrac - EDGE_FADE_START) / (EDGE_FADE_END - EDGE_FADE_START)));

  const bloom = (x: number, y: number, r: number, c: Rgb, a: number): void => {
    if (a <= 0.002 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`);
    g.addColorStop(0.45, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a * 0.32})`);
    g.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  const draw = (nowMs: number): void => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
    ctx.fillRect(0, 0, width, height);

    // Additive glow on dark; soft watercolor wash on light.
    ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter';
    const baseAlpha = isLight ? 0.17 : 0.13;
    const px = pointer.x * width;
    const py = pointer.y * height;

    for (const b of blooms) {
      const t = nowMs * DRIFT_SPEED * b.speed + b.phase;
      let x = (b.bx + Math.cos(t) * DRIFT_AMP) * width;
      let y = (b.by + Math.sin(t * 0.82) * DRIFT_AMP) * height;
      const rad = b.r * minDim;
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy) || 1;
      if (d < rad) {
        const f = (1 - d / rad) * POINTER_REPEL * minDim;
        x += (dx / d) * f;
        y += (dy / d) * f;
      }
      bloom(x, y, rad, palette[b.ci], baseAlpha * edgeAlpha(x / width));
    }

    // Cursor glow — a soft bloom that tracks the pointer.
    bloom(px, py, CURSOR_BLOOM_R * minDim, palette[0], baseAlpha * 0.95 * edgeAlpha(pointer.x));

    // Click ripples — a bloom that expands and fades.
    for (let i = 0; i < DROP_COUNT; i++) {
      if (dropT0[i] === 0) continue;
      const age = (nowMs - dropT0[i]) / CLICK_LIFE_MS;
      if (age >= 1) {
        dropT0[i] = 0;
        continue;
      }
      const r = (0.06 + age * 0.4) * minDim;
      bloom(dropX[i], dropY[i], r, palette[1], baseAlpha * 1.5 * (1 - age) * edgeAlpha(dropX[i] / width));
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const render = (nowMs: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (!visible || document.visibilityState !== 'visible') return;
    pointer.x += (target.x - pointer.x) * POINTER_LERP;
    pointer.y += (target.y - pointer.y) * POINTER_LERP;
    draw(nowMs);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const nx = event.clientX / Math.max(window.innerWidth, 1);
    const ny = event.clientY / Math.max(window.innerHeight, 1);
    target.x = nx;
    target.y = ny;
    document.documentElement.style.setProperty('--pointer-x', String(nx));
    document.documentElement.style.setProperty('--pointer-y', String(ny));
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (
      event.target instanceof Element &&
      event.target.closest('button, a, input, textarea, select, label')
    ) {
      return;
    }
    dropX[dropCursor] = event.clientX;
    dropY[dropCursor] = event.clientY;
    dropT0[dropCursor] = performance.now();
    dropCursor = (dropCursor + 1) % DROP_COUNT;
  };

  const onResize = (): void => resize();

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.01 },
  );

  syncTheme();
  draw(2600);
  layer.classList.add('is-splash-field-ready');

  if (options.reducedMotion) {
    // Static frame: blooms frozen at a natural drift offset (never animates).
    const paint = (): void => draw(2600);
    return {
      dispose: () => {
        disposed = true;
      },
      syncTheme: () => {
        syncTheme();
        paint();
      },
    };
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  observer.observe(layer);
  raf = requestAnimationFrame(render);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
    },
    syncTheme,
  };
}
