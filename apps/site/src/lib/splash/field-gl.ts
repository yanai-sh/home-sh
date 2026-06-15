/** WebGL2 curl-noise flow field — ambient splash chrome (shader demo, no WASM). */

export const POINTER_REST_X = 0.68;
export const POINTER_REST_Y = 0.48;
export const POINTER_LERP = 0.08;
/** ~300ms contact tint ramp at 60fps. */
export const CONTACT_LERP = 0.12;

const FIELD_BASE_INTENSITY = 0.22;
const SPLIT_INTENSITY_BOOST = 0.12;
const GRAIN_STRENGTH = 0.03;
const GRAIN_STRENGTH_LIGHT = 0.022;
const CONTACT_TINT_MIX = 0.65;
const EDGE_MASK_START = 0.12;
const EDGE_MASK_END = 0.42;
const POINTER_PULL = 0.5;
const POINTER_GLOW = 0.5;
/** Pointer-stir interactivity: mouse motion swirls the field; clicks drop ink. */
const POINTER_LERP_FAST = 0.22; // how quickly the stir center tracks the cursor
const POINTER_SWIRL_STRENGTH = 1.4;
const STIR_GLOW = 0.22;
const STIR_DECAY = 0.92;
const STIR_MAX = 1.6;
const POINTER_VELOCITY_SCALE = 0.22;
const DROP_COUNT = 8;
const DROP_LIFE_MS = 2400;
const DROP_BLOOM_SPEED = 0.42;
const DROP_DECAY = 1.3;
const DROP_STRENGTH = 0.7;

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_split;
uniform float u_contact;
uniform float u_grain;
uniform vec3 u_bg;
uniform vec3 u_accent;
uniform vec3 u_mint;
uniform float u_stir;
uniform vec2 u_pointerVel;
uniform vec3 u_drops[${DROP_COUNT}];

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.985));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

vec2 curl(vec2 p) {
  const float e = 0.0015;
  float n1 = fbm(p + vec2(0.0, e));
  float n2 = fbm(p - vec2(0.0, e));
  float n3 = fbm(p + vec2(e, 0.0));
  float n4 = fbm(p - vec2(e, 0.0));
  return vec2(n1 - n2, n4 - n3) / (2.0 * e);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (uv - vec2(0.5)) * vec2(aspect, 1.0);

  vec2 ptr = (u_pointer - vec2(0.5)) * vec2(aspect, 1.0);
  float ptrDist = length(p - ptr);
  float ptrPull = exp(-ptrDist * ptrDist * 9.0) * ${POINTER_PULL};

  // Pointer stir: drag the ink along the cursor's motion (advection) and add a
  // tangential swirl, both localised near the pointer and scaled by speed.
  float stirFalloff = exp(-ptrDist * ptrDist * 6.0);
  vec2 perp = vec2(-(p - ptr).y, (p - ptr).x);

  vec2 flow = curl(p * 1.15 + u_time * 0.018);
  flow += normalize(p - ptr + 0.001) * ptrPull;
  flow += u_pointerVel * stirFalloff * ${POINTER_SWIRL_STRENGTH};
  flow += perp * u_stir * stirFalloff * ${POINTER_SWIRL_STRENGTH};
  vec2 q = p + flow * 0.55;
  q += curl(q * 0.9 + u_time * 0.012) * 0.4;

  float n = fbm(q * 1.8 + u_time * 0.025);
  float streak = fbm(vec2(q.x * 0.6 - u_time * 0.04, q.y * 2.2));
  float field = mix(n, streak, 0.35);

  float edge = smoothstep(${EDGE_MASK_START}, ${EDGE_MASK_END}, uv.x);
  float vignette = smoothstep(1.35, 0.25, length(p * vec2(0.55, 0.9)));
  float intensity = (${FIELD_BASE_INTENSITY} + u_split * ${SPLIT_INTENSITY_BOOST}) * edge * vignette;

  vec3 tint = mix(u_accent, u_mint, u_contact * ${CONTACT_TINT_MIX});

  // Accumulate a single coverage amount, then mix the background TOWARD the tint.
  // This darkens light backgrounds (ink on paper) and lightens dark ones, so the
  // field reads correctly in both themes — unlike a purely additive blend.
  float amount = field * intensity;
  amount += ptrPull * ${POINTER_GLOW} * edge;
  amount += u_stir * stirFalloff * ${STIR_GLOW} * edge;

  // Click ripples: expanding rings that bloom and fade (age in seconds; 0 = inactive).
  for (int i = 0; i < ${DROP_COUNT}; i++) {
    vec3 drop = u_drops[i];
    if (drop.z <= 0.0) continue;
    vec2 dp = (drop.xy - vec2(0.5)) * vec2(aspect, 1.0);
    float dDist = length(p - dp);
    float radius = drop.z * ${DROP_BLOOM_SPEED};
    float ring = exp(-(dDist - radius) * (dDist - radius) * 60.0);
    amount += ring * exp(-drop.z * ${DROP_DECAY}) * ${DROP_STRENGTH} * edge;
  }

  amount = clamp(amount, 0.0, 1.0);
  vec3 col = mix(u_bg, tint, amount);

  float grain = hash21(gl_FragCoord.xy + u_time) * u_grain;
  col += (grain - u_grain * 0.5) * edge * 0.5;

  outColor = vec4(col, 1.0);
}
`;

type Rgb = [number, number, number];

export type SplashFieldHandle = {
  dispose: () => void;
  syncTheme: () => void;
};

function parseHexColor(raw: string): Rgb {
  const hex = raw.trim().replace('#', '');
  if (hex.length !== 6) return [0.08, 0.11, 0.13];
  const n = Number.parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function readCssRgb(varName: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw.startsWith('#')) return parseHexColor(raw);
  return fallback;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'shader compile error';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'program link error';
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

function readContactTarget(): number {
  const mode = document.documentElement.dataset.siteMode ?? 'splash';
  return mode === 'contact' ? 1 : 0;
}

function readGrainStrength(): number {
  const theme = document.documentElement.dataset.theme ?? 'dark';
  return theme === 'light' ? GRAIN_STRENGTH_LIGHT : GRAIN_STRENGTH;
}

export function initSplashField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: { reducedMotion: boolean },
): SplashFieldHandle | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = createProgram(gl);
  } catch {
    return null;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const loc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uPointer = gl.getUniformLocation(program, 'u_pointer');
  const uSplit = gl.getUniformLocation(program, 'u_split');
  const uContact = gl.getUniformLocation(program, 'u_contact');
  const uGrain = gl.getUniformLocation(program, 'u_grain');
  const uBg = gl.getUniformLocation(program, 'u_bg');
  const uAccent = gl.getUniformLocation(program, 'u_accent');
  const uMint = gl.getUniformLocation(program, 'u_mint');
  const uStir = gl.getUniformLocation(program, 'u_stir');
  const uPointerVel = gl.getUniformLocation(program, 'u_pointerVel');
  const uDrops = gl.getUniformLocation(program, 'u_drops');

  let pointer = { x: POINTER_REST_X, y: POINTER_REST_Y };
  let pointerTarget = { ...pointer };
  let contactValue = readContactTarget();
  let raf = 0;
  let visible = true;
  let disposed = false;

  // Pointer velocity (shader space, y up) — set on move, decayed each frame.
  const pointerVel = { x: 0, y: 0 };
  const lastMove = { x: POINTER_REST_X, y: POINTER_REST_Y, t: 0 };
  const clampStir = (v: number): number => Math.max(-STIR_MAX, Math.min(STIR_MAX, v));

  // Click ink-drops, stored as a small ring buffer; flattened to (x, y, age) per frame.
  const dropX = new Float32Array(DROP_COUNT);
  const dropY = new Float32Array(DROP_COUNT);
  const dropT0 = new Float64Array(DROP_COUNT); // performance.now() ms; 0 = inactive
  const dropData = new Float32Array(DROP_COUNT * 3);
  let dropCursor = 0;

  const syncTheme = (): void => {
    const bg = readCssRgb('--color-background', [0.082, 0.106, 0.133]);
    const accent = readCssRgb('--color-accent-text', [0.47, 0.64, 1.0]);
    const mint = readCssRgb('--color-ok', [0.46, 1.0, 0.84]);
    gl.useProgram(program);
    gl.uniform3fv(uBg, bg);
    gl.uniform3fv(uAccent, accent);
    gl.uniform3fv(uMint, mint);
    gl.uniform1f(uGrain, readGrainStrength());
  };

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  };

  const readSplit = (): number => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--split-progress').trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  };

  const render = (timeMs: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (!visible || document.visibilityState !== 'visible') return;

    pointer.x += (pointerTarget.x - pointer.x) * POINTER_LERP_FAST;
    pointer.y += (pointerTarget.y - pointer.y) * POINTER_LERP_FAST;
    contactValue += (readContactTarget() - contactValue) * CONTACT_LERP;

    resize();
    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeMs * 0.001);
    gl.uniform2f(uPointer, pointer.x, 1 - pointer.y);
    gl.uniform1f(uSplit, readSplit());
    gl.uniform1f(uContact, contactValue);
    gl.uniform1f(uGrain, readGrainStrength());

    pointerVel.x *= STIR_DECAY;
    pointerVel.y *= STIR_DECAY;
    for (let i = 0; i < DROP_COUNT; i++) {
      const t0 = dropT0[i];
      let age = 0;
      if (t0 !== 0) {
        if (timeMs - t0 > DROP_LIFE_MS) dropT0[i] = 0;
        else age = (timeMs - t0) / 1000;
      }
      dropData[i * 3] = dropX[i];
      dropData[i * 3 + 1] = dropY[i];
      dropData[i * 3 + 2] = age;
    }
    gl.uniform1f(uStir, Math.hypot(pointerVel.x, pointerVel.y));
    gl.uniform2f(uPointerVel, pointerVel.x, pointerVel.y);
    gl.uniform3fv(uDrops, dropData);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
      const dt = Math.max(now - lastMove.t, 8) / 1000;
      // Shader space has y up, so negate the screen-space dy.
      pointerVel.x = clampStir(((nx - lastMove.x) / dt) * POINTER_VELOCITY_SCALE);
      pointerVel.y = clampStir((-(ny - lastMove.y) / dt) * POINTER_VELOCITY_SCALE);
    }
    lastMove.x = nx;
    lastMove.y = ny;
    lastMove.t = now;
  };

  const onPointerDown = (event: PointerEvent): void => {
    // Skip drops on real UI controls so their clicks stay purposeful.
    if (
      event.target instanceof Element &&
      event.target.closest('button, a, input, textarea, select, label')
    ) {
      return;
    }
    dropX[dropCursor] = event.clientX / Math.max(window.innerWidth, 1);
    dropY[dropCursor] = 1 - event.clientY / Math.max(window.innerHeight, 1);
    dropT0[dropCursor] = performance.now();
    dropCursor = (dropCursor + 1) % DROP_COUNT;
  };

  const onResize = (): void => {
    resize();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.01 },
  );

  syncTheme();
  resize();
  layer.classList.add('is-splash-field-ready');

  if (options.reducedMotion) {
    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uPointer, pointer.x, 1 - pointer.y);
    gl.uniform1f(uSplit, readSplit());
    gl.uniform1f(uContact, readContactTarget());
    gl.uniform1f(uGrain, readGrainStrength());
    syncTheme();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return {
      dispose: () => {
        disposed = true;
        gl.deleteProgram(program);
        gl.deleteBuffer(quad);
        gl.deleteVertexArray(vao);
      },
      syncTheme,
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
      gl.deleteProgram(program);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
    },
    syncTheme,
  };
}
