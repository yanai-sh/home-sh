/** WebGL2 curl-noise flow field — ambient splash chrome (shader demo, no WASM). */

export const POINTER_REST_X = 0.68;
export const POINTER_REST_Y = 0.48;
export const POINTER_LERP = 0.08;
/** ~300ms contact tint ramp at 60fps. */
export const CONTACT_LERP = 0.12;

const FIELD_BASE_INTENSITY = 0.065;
const SPLIT_INTENSITY_BOOST = 0.1;
const GRAIN_STRENGTH = 0.024;
const GRAIN_STRENGTH_LIGHT = 0.018;
const CONTACT_TINT_MIX = 0.65;
const EDGE_MASK_START = 0.2;
const EDGE_MASK_END = 0.5;
const POINTER_PULL = 0.35;
const POINTER_GLOW = 0.22;

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

  vec2 flow = curl(p * 1.15 + u_time * 0.018);
  flow += normalize(p - ptr + 0.001) * ptrPull;
  vec2 q = p + flow * 0.55;
  q += curl(q * 0.9 + u_time * 0.012) * 0.4;

  float n = fbm(q * 1.8 + u_time * 0.025);
  float streak = fbm(vec2(q.x * 0.6 - u_time * 0.04, q.y * 2.2));
  float field = mix(n, streak, 0.35);

  float edge = smoothstep(${EDGE_MASK_START}, ${EDGE_MASK_END}, uv.x);
  float vignette = smoothstep(1.35, 0.25, length(p * vec2(0.55, 0.9)));
  float intensity = (${FIELD_BASE_INTENSITY} + u_split * ${SPLIT_INTENSITY_BOOST}) * edge * vignette;

  vec3 tint = mix(u_accent, u_mint, u_contact * ${CONTACT_TINT_MIX});
  vec3 col = u_bg;
  col += tint * field * intensity;
  col += tint * ptrPull * ${POINTER_GLOW} * edge;

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

  let pointer = { x: POINTER_REST_X, y: POINTER_REST_Y };
  let pointerTarget = { ...pointer };
  let contactValue = readContactTarget();
  let raf = 0;
  let visible = true;
  let disposed = false;

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

    pointer.x += (pointerTarget.x - pointer.x) * POINTER_LERP;
    pointer.y += (pointerTarget.y - pointer.y) * POINTER_LERP;
    contactValue += (readContactTarget() - contactValue) * CONTACT_LERP;

    resize();
    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeMs * 0.001);
    gl.uniform2f(uPointer, pointer.x, 1 - pointer.y);
    gl.uniform1f(uSplit, readSplit());
    gl.uniform1f(uContact, contactValue);
    gl.uniform1f(uGrain, readGrainStrength());

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const onPointerMove = (event: PointerEvent): void => {
    pointerTarget.x = event.clientX / Math.max(window.innerWidth, 1);
    pointerTarget.y = event.clientY / Math.max(window.innerHeight, 1);
    document.documentElement.style.setProperty('--pointer-x', String(pointerTarget.x));
    document.documentElement.style.setProperty('--pointer-y', String(pointerTarget.y));
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
  window.addEventListener('resize', onResize, { passive: true });
  observer.observe(layer);
  raf = requestAnimationFrame(render);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      gl.deleteProgram(program);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
    },
    syncTheme,
  };
}
