/**
 * Canvas 2D "ink in water" flow field — ambient splash chrome.
 * Pure 2D canvas (no WebGL/GPU) so it renders identically on every browser.
 * Particles drift along a curl-noise flow, leaving fading ink trails; the
 * pointer stirs them and clicks drop expanding ripples.
 */

export const POINTER_REST_X = 0.72;
export const POINTER_REST_Y = 0.42;

export type SplashFieldHandle = {
  dispose: () => void;
  syncTheme: () => void;
};

type Rgb = [number, number, number];

const PARTICLE_COUNT = 900;
const TRAIL_FADE = 0.05; // per-frame backdrop alpha — lower = longer ink trails
const FLOW_SCALE = 0.0016; // noise sampling scale (per px)
const FLOW_SPEED = 26; // particle speed (px/sec at 60fps baseline)
const TIME_SPEED = 0.06; // flow evolution speed
const DAMPING = 0.82;
const POINTER_RADIUS = 240; // px influence radius
const POINTER_SWIRL = 0.9; // tangential stir near the pointer
const POINTER_PUSH = 0.45; // velocity-driven shove
const POINTER_LERP = 0.2;
const STIR_DECAY = 0.9;
const LINE_WIDTH = 1.2;
const LINE_ALPHA = 0.5;
const DROP_COUNT = 6;
const DROP_LIFE_MS = 1500;
const DROP_PUSH = 220; // px/sec outward impulse near a fresh drop

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

function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 3; i++) {
    v += amp * valueNoise(px, py);
    px *= 2.03;
    py *= 2.03;
    amp *= 0.5;
  }
  return v;
}

/** Divergence-free flow direction from the curl of fbm (finite differences). */
function curl(x: number, y: number): [number, number] {
  const e = 0.4;
  const n1 = fbm(x, y + e);
  const n2 = fbm(x, y - e);
  const n3 = fbm(x + e, y);
  const n4 = fbm(x - e, y);
  return [(n1 - n2) / (2 * e), (n4 - n3) / (2 * e)];
}

export function initSplashField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: { reducedMotion: boolean },
): SplashFieldHandle | null {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;

  let bg: Rgb = [21, 27, 34];
  let accent: Rgb = [120, 164, 255];
  let mint: Rgb = [118, 255, 213];
  let isLight = false;

  const syncTheme = (): void => {
    bg = readRgb('--color-background', bg);
    accent = readRgb('--color-accent-text', accent);
    mint = readRgb('--color-ok', mint);
    isLight = document.documentElement.dataset.theme === 'light';
  };

  let width = 1;
  let height = 1;
  let dpr = 1;
  const resize = (): void => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  type Particle = { x: number; y: number; px: number; py: number; vx: number; vy: number };
  const particles: Particle[] = [];
  const spawn = (): Particle => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return { x, y, px: x, py: y, vx: 0, vy: 0 };
  };
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawn());

  const pointer = { x: POINTER_REST_X, y: POINTER_REST_Y };
  const pointerTarget = { ...pointer };
  const pointerVel = { x: 0, y: 0 };
  const lastMove = { x: 0, y: 0, t: 0 };
  const dropX = new Float64Array(DROP_COUNT);
  const dropY = new Float64Array(DROP_COUNT);
  const dropT0 = new Float64Array(DROP_COUNT);
  let dropCursor = 0;

  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastFrame = 0;

  const fade = (): void => {
    ctx.fillStyle = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${TRAIL_FADE})`;
    ctx.fillRect(0, 0, width, height);
  };

  const clearAll = (): void => {
    ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
    ctx.fillRect(0, 0, width, height);
  };

  const step = (dt: number, nowMs: number): void => {
    const t = nowMs * 0.001 * TIME_SPEED;
    const px = pointer.x * width;
    const py = pointer.y * height;
    const stir = Math.hypot(pointerVel.x, pointerVel.y);
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (const p of particles) {
      const [fx, fy] = curl(p.x * FLOW_SCALE + t, p.y * FLOW_SCALE);
      let ax = fx * FLOW_SPEED;
      let ay = fy * FLOW_SPEED;

      // Pointer stir: swirl + velocity-driven shove within the influence radius.
      const dx = p.x - px;
      const dy = p.y - py;
      const dist = Math.hypot(dx, dy);
      let near = 0;
      if (dist < POINTER_RADIUS) {
        near = 1 - dist / POINTER_RADIUS;
        const inv = 1 / (dist || 1);
        ax += -dy * inv * near * POINTER_SWIRL * FLOW_SPEED;
        ay += dx * inv * near * POINTER_SWIRL * FLOW_SPEED;
        ax += pointerVel.x * near * POINTER_PUSH;
        ay += pointerVel.y * near * POINTER_PUSH;
      }

      // Click ripples: outward push that fades with age.
      for (let i = 0; i < DROP_COUNT; i++) {
        if (dropT0[i] === 0) continue;
        const age = (nowMs - dropT0[i]) / DROP_LIFE_MS;
        if (age >= 1) {
          dropT0[i] = 0;
          continue;
        }
        const ddx = p.x - dropX[i];
        const ddy = p.y - dropY[i];
        const dd = Math.hypot(ddx, ddy) || 1;
        const ring = Math.max(0, 1 - Math.abs(dd - age * 260) / 120) * (1 - age);
        ax += (ddx / dd) * ring * DROP_PUSH;
        ay += (ddy / dd) * ring * DROP_PUSH;
      }

      p.vx = (p.vx + ax * dt) * DAMPING;
      p.vy = (p.vy + ay * dt) * DAMPING;
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around the edges (respawn far strays for an even field).
      if (p.x < -2 || p.x > width + 2 || p.y < -2 || p.y > height + 2) {
        const np = spawn();
        p.x = np.x;
        p.y = np.y;
        p.px = p.x;
        p.py = p.y;
        p.vx = 0;
        p.vy = 0;
        continue;
      }

      const speed = Math.hypot(p.vx, p.vy);
      const heat = Math.min(1, near + Math.min(1, speed / 60) * 0.4);
      const col: Rgb = [
        accent[0] + (mint[0] - accent[0]) * heat * 0.6,
        accent[1] + (mint[1] - accent[1]) * heat * 0.6,
        accent[2] + (mint[2] - accent[2]) * heat * 0.6,
      ];
      const alpha = Math.min(1, LINE_ALPHA * (0.4 + heat));
      ctx.strokeStyle = isLight
        ? `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 0.55})`
        : `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    pointerVel.x *= STIR_DECAY;
    pointerVel.y *= STIR_DECAY;
  };

  const render = (nowMs: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (!visible || document.visibilityState !== 'visible') {
      lastFrame = nowMs;
      return;
    }
    const dt = Math.min(0.05, lastFrame ? (nowMs - lastFrame) / 1000 : 0.016);
    lastFrame = nowMs;

    pointer.x += (pointerTarget.x - pointer.x) * POINTER_LERP;
    pointer.y += (pointerTarget.y - pointer.y) * POINTER_LERP;

    fade();
    step(dt, nowMs);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const nx = event.clientX / Math.max(window.innerWidth, 1);
    const ny = event.clientY / Math.max(window.innerHeight, 1);
    pointerTarget.x = nx;
    pointerTarget.y = ny;
    document.documentElement.style.setProperty('--pointer-x', String(nx));
    document.documentElement.style.setProperty('--pointer-y', String(ny));
    const now = performance.now();
    if (lastMove.t !== 0) {
      const dtm = Math.max(now - lastMove.t, 8) / 1000;
      pointerVel.x = ((nx - lastMove.x) * window.innerWidth) / dtm;
      pointerVel.y = ((ny - lastMove.y) * window.innerHeight) / dtm;
    }
    lastMove.x = nx;
    lastMove.y = ny;
    lastMove.t = now;
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
  clearAll();
  layer.classList.add('is-splash-field-ready');

  if (options.reducedMotion) {
    // Static frame: a few flow steps stamped once, no animation loop.
    for (let i = 0; i < 24; i++) step(0.016, i * 16);
    return {
      dispose: () => {
        disposed = true;
      },
      syncTheme: () => {
        syncTheme();
        clearAll();
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
    syncTheme: () => {
      syncTheme();
      clearAll();
    },
  };
}
