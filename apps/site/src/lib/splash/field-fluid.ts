/**
 * Hand-owned WebGL2 "viscous ink in water" splash — a real 2D incompressible
 * stable-fluids simulation (Stam), rendered as dark ink that *darkens* a lighter
 * base (suminagashi / ink-in-water, not bright additive color).
 *
 * The simulation core is vendored from PavelDoGreat's WebGL fluid (advection,
 * divergence/Jacobi-pressure projection, and crucially *vorticity confinement* —
 * the lively folding that keeps ink as tendrils instead of diffusing to flat grey),
 * ported to GLSL ES 3.00. We render it with our own dark-ink display, not the
 * library's additive glow.
 *
 * Model = ink: a passive dye, seeded once as distinct masses (a full, separate-blob
 * start), folded forever by a divergence-free flow — an ambient curl-noise base
 * current plus vorticity confinement (mass-conserving → never empties). The pointer
 * stirs the medium (adds velocity, never new ink).
 *
 * Per-frame pipeline: curl-noise + pointer force → curl → vorticity confinement →
 * divergence → clear → Jacobi pressure → subtract gradient → advect velocity →
 * advect dye → dark-ink display pass.
 *
 * Returns null when WebGL2 / float render targets / a capable GPU are unavailable
 * so the caller falls back to the baked static still (see field.ts). It also bails
 * to the still at runtime (adding .is-splash-still, hiding the canvas) if the FPS
 * guard detects a software renderer or a machine that can't keep up.
 *
 * Theme is driven by two CSS custom properties read in syncTheme():
 *   --splash-base (the medium) and --splash-ink (the ink) — see global.css.
 */

import type { SplashFieldHandle } from "./field";

// ── Tunables ────────────────────────────────────────────────────────────────
const SIM_RES = 160; // velocity / pressure / divergence grid (scaled by aspect)
const DYE_RES = 768; // ink grid — enough for fine streaks; lower = faster init + cheaper
const PRESSURE_ITERS = 24;
const POINTER_MAX_DELTA = 0.05; // clamp per-frame mouse movement (no flick spikes)
const DYE_DISSIPATION = 1.0; // ink persists (mass-conserving look)
const MAX_DPR = 2;
const FPS_BAIL = 36; // average fps below this over the warmup window → fall back
const FPS_WARMUP_MS = 1500;
// Seed = a full-screen marbled ink field (domain-warped fbm): connected, organic
// tendrils covering the canvas, so it reads as a body of ink dispersed in water.
// (Sparse discrete blobs read as smoke wisps / puddles — that was the regression.)
// The vendored solver then folds it (vorticity) and the diffusion bleeds it.
const WARMUP_STEPS = 4; // minimal — the marbled field is already full, so show it at once

// Live-tunable "feel" params. Defaults are a calm middle between "barely visible"
// and "way too much". In dev they're exposed on window.__splashTune so the look
// can be dialed in the browser console with no rebuild; bake the final numbers.
const TUNE_DEFAULTS = {
  noiseAmp: 65, // curl-noise force gain — kept low: the ink barely drifts on its own
  noiseScale: 1.4, // flow spatial frequency — lower = bigger, slower vortices
  //                  (coherent sections that swirl together, not thin streaks)
  noiseDrift: 0.08, // how fast the force field evolves over time (extra de-correlation)
  curl: 15, // vorticity confinement — self-sustaining eddies; livelier folding
  pressureDecay: 0.8, // pressure carried between frames (Stam/PavelDoGreat default)
  velocityDissipation: 0.97, // momentum decay — lets the cursor wake flow on a moment
  pointerPush: 320, // drag strength — the cursor is the main mover now
  pointerSwirl: 1100, // vortex strength around the cursor (gentle swirl)
  pointerRadius: 0.0045, // gaussian radius² — a small area right around the cursor
  pointerDecay: 0.86, // per-frame decay of the stir impulse (higher = longer-lasting wake)
  dyeDiffuse: 0.003, // how fast ink bleeds/softens into neighbours (low = crisp ink filaments)
  regen: 0.012, // self-heal rate toward the marbled field (keeps contrast; refills cleared areas)
  inkLo: 0.0, // display tone-curve start
  inkHi: 0.9, // ...end (shared); per-theme visibility tuned via base/ink contrast
};

// ── Small GLSL noise lib (prepended to shaders that need it) ─────────────────
// Gradient (Perlin-style) noise — isotropic, no axis-aligned square lattice (value
// noise showed its grid as squares). Sin-free hash → stable on weak GPUs.
const NOISE_GLSL = `
vec2 hash22(vec2 p){
  vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
  a += dot(a, a + 34.45);
  return fract(vec2(a.x * a.y, a.y * a.z)) * 2.0 - 1.0;
}
float gnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.5;
}
float fbm(vec2 p){
  float v = 0.0; float amp = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += amp * gnoise(p); p = m * p * 2.0; amp *= 0.5; }
  return v;
}
`;

// Manual bilinear sampling — half-float textures aren't reliably hardware-filtered
// (some drivers, e.g. Windows-on-ARM/ANGLE, sample NEAREST → visible sim-grid
// blocks). Textures are NEAREST and we interpolate here, so it's GPU-agnostic.
const BILERP_GLSL = `
vec4 bilerp(sampler2D tex, vec2 uv, vec2 texel){
  vec2 st = uv / texel - 0.5;
  vec2 iuv = floor(st);
  vec2 f = fract(st);
  vec4 a = texture(tex, (iuv + vec2(0.5, 0.5)) * texel);
  vec4 b = texture(tex, (iuv + vec2(1.5, 0.5)) * texel);
  vec4 c = texture(tex, (iuv + vec2(0.5, 1.5)) * texel);
  vec4 d = texture(tex, (iuv + vec2(1.5, 1.5)) * texel);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

// ── Shaders ──────────────────────────────────────────────────────────────────
const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texelSize;
void main(){
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAG_COPY = `#version 300 es
precision highp float;
uniform sampler2D uTexture; in vec2 vUv; out vec4 result;
void main(){ result = texture(uTexture, vUv); }`;

// Full-screen marbled ink field — the starting state (connected ink, not blobs).
const FRAG_SEED = `#version 300 es
precision highp float;
${NOISE_GLSL}
uniform vec2 uSeed; in vec2 vUv; out vec4 result;
void main(){
  vec2 p = vUv * 3.0 + uSeed;
  float n = fbm(p);
  float n2 = fbm(p * 2.0 + n * 2.4);          // domain-warp → marbled tendrils
  float d = smoothstep(0.42, 0.66, mix(n, n2, 0.6));
  // mild edge fade only (keep ink out to the edges)
  float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x)
             * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  result = vec4(d * mix(0.8, 1.0, edge), 0.0, 0.0, 1.0);
}`;

const FRAG_ADVECT = `#version 300 es
precision highp float;
${BILERP_GLSL}
uniform sampler2D uVelocity; uniform sampler2D uSource;
uniform vec2 uTexelSize; uniform vec2 uSourceTexel; uniform float dt; uniform float dissipation;
in vec2 vUv; out vec4 result;
void main(){
  vec2 vel = bilerp(uVelocity, vUv, uTexelSize).xy;
  vec2 coord = vUv - dt * vel * uTexelSize;
  result = bilerp(uSource, coord, uSourceTexel) * dissipation;
}`;

const FRAG_DIVERGENCE = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  // Closed-box walls: reflect velocity at the edges so flow stays tangent and the
  // ink is locked inside the screen (never advects off / disappears).
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  result = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const FRAG_PRESSURE = `#version 300 es
precision highp float;
uniform sampler2D uPressure; uniform sampler2D uDivergence;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float L = texture(uPressure, vL).x; float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x; float B = texture(uPressure, vB).x;
  float div = texture(uDivergence, vUv).x;
  result = vec4((L + R + T + B - div) * 0.25, 0.0, 0.0, 1.0);
}`;

const FRAG_GRADIENT = `#version 300 es
precision highp float;
uniform sampler2D uPressure; uniform sampler2D uVelocity;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float L = texture(uPressure, vL).x; float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x; float B = texture(uPressure, vB).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  result = vec4(vel, 0.0, 1.0);
}`;

// PavelDoGreat solver core (vendored, ported to GLSL ES 3.00): vorticity gives the
// natural, lively folding the hand-rolled flow lacked.
const FRAG_CURL = `#version 300 es
precision highp float;
uniform sampler2D uVelocity; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  result = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const FRAG_VORTICITY = `#version 300 es
precision highp float;
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float uCurlAmt; uniform float dt;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlAmt * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel += force * dt;
  vel = clamp(vel, -1000.0, 1000.0);
  result = vec4(vel, 0.0, 1.0);
}`;

// Decays carried-over pressure each frame before the Jacobi solve.
const FRAG_CLEAR = `#version 300 es
precision highp float;
uniform sampler2D uTexture; uniform float uValue; in vec2 vUv; out vec4 result;
void main(){ result = uValue * texture(uTexture, vUv); }`;

// Ink self-heal: gently pull the dye back toward the original marbled field so heavy
// stirring can never smear it away — cleared areas refill over a few seconds.
const FRAG_REGEN = `#version 300 es
precision highp float;
uniform sampler2D uDye; uniform sampler2D uSeedTex; uniform float uRate;
in vec2 vUv; out vec4 result;
void main(){
  float d = texture(uDye, vUv).x;
  float s = texture(uSeedTex, vUv).x;
  result = vec4(mix(d, s, uRate), 0.0, 0.0, 1.0);
}`;

// Dye diffusion: spread ink toward its neighbours so streaks soften and bleed like
// ink in water (a 4-neighbour blur lerp; uK = per-frame strength).
const FRAG_DIFFUSE = `#version 300 es
precision highp float;
uniform sampler2D uDye; uniform float uK;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 result;
void main(){
  float c = texture(uDye, vUv).x;
  float avg = 0.25 * (texture(uDye, vL).x + texture(uDye, vR).x
                    + texture(uDye, vT).x + texture(uDye, vB).x);
  result = vec4(mix(c, avg, uK), 0.0, 0.0, 1.0);
}`;

const FRAG_FORCE = `#version 300 es
precision highp float;
${NOISE_GLSL}
uniform sampler2D uVelocity; uniform float dt;
uniform float uNoiseScale; uniform vec2 uNoiseOffset; uniform float uNoiseEps;
uniform float uNoiseAmp;
uniform vec2 uPointer; uniform vec2 uPointerDelta; uniform float uPointerPush;
uniform float uPointerSwirl; uniform float uPointerRadius; uniform float uAspect;
in vec2 vUv; out vec4 result;
float psi(vec2 p){ return fbm(p); }
void main(){
  vec2 vel = texture(uVelocity, vUv).xy;
  // divergence-free curl-noise body force: force = curl of a scalar potential
  // = (∂ψ/∂y, −∂ψ/∂x). 3-sample forward difference; offset + eps precomputed CPU-side.
  vec2 p = vUv * uNoiseScale + uNoiseOffset;
  float c0 = psi(p);
  float cx = psi(p + vec2(uNoiseEps, 0.0));
  float cy = psi(p + vec2(0.0, uNoiseEps));
  vec2 curl = vec2(cy - c0, -(cx - c0)) / uNoiseEps;
  // ADD it as an acceleration — the solver carries the momentum, so the ink flows
  // *through* the field instead of anchoring to its stagnation points. (Overwriting
  // velocity toward this field each frame was the fundamental "anchored" bug.)
  vel += curl * uNoiseAmp * dt;
  // pointer stir — drag push (projection turns it into swirling wakes) + an
  // explicit vortex around the cursor, both with a gaussian falloff.
  vec2 d = vUv - uPointer; d.x *= uAspect;
  float fall = exp(-dot(d, d) / uPointerRadius);
  vel += uPointerDelta * uPointerPush * fall;
  vel += vec2(-d.y, d.x) * length(uPointerDelta) * uPointerSwirl * fall;
  result = vec4(vel, 0.0, 1.0);
}`;

const FRAG_DISPLAY = `#version 300 es
precision highp float;
${NOISE_GLSL}
${BILERP_GLSL}
uniform sampler2D uDye; uniform vec2 uDyeTexel; uniform vec3 uBase; uniform vec3 uInk;
uniform float uInkLo; uniform float uInkHi; in vec2 vUv; out vec4 result;
void main(){
  float d = clamp(bilerp(uDye, vUv, uDyeTexel).x, 0.0, 1.0);
  float t = smoothstep(uInkLo, uInkHi, d);
  vec3 col = mix(uBase, uInk, t);
  // Interleaved-gradient-noise dither (precision-stable on weak GPUs — a vUv*1024
  // hash banded into a square grid on some drivers).
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  col += (ign - 0.5) * (1.6 / 255.0);
  result = vec4(col, 1.0);
}`;

// ── GL helpers ────────────────────────────────────────────────────────────────
function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[splash] shader compile failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

function makeProgram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  fragSrc: string,
): Program | null {
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[splash] program link failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

type FBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
  attach: (unit: number) => number;
};

function createFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internal: number,
  format: number,
  type: number,
  filter: number,
): FBO | null {
  const texture = gl.createTexture();
  const fbo = gl.createFramebuffer();
  if (!texture || !fbo) return null;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {
    texture,
    fbo,
    width: w,
    height: h,
    texelX: 1 / w,
    texelY: 1 / h,
    attach(unit: number) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return unit;
    },
  };
}

type DoubleFBO = { read: FBO; write: FBO; swap: () => void } & Pick<FBO, "texelX" | "texelY">;

function createDoubleFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internal: number,
  format: number,
  type: number,
  filter: number,
): DoubleFBO | null {
  const a = createFBO(gl, w, h, internal, format, type, filter);
  const b = createFBO(gl, w, h, internal, format, type, filter);
  if (!a || !b) return null;
  let read = a;
  let write = b;
  return {
    texelX: a.texelX,
    texelY: a.texelY,
    get read() {
      return read;
    },
    get write() {
      return write;
    },
    swap() {
      const t = read;
      read = write;
      write = t;
    },
  } as DoubleFBO;
}

function parseHex(raw: string, fallback: [number, number, number]): [number, number, number] {
  const hex = raw.trim().replace("#", "");
  if (hex.length !== 6) return fallback;
  const n = Number.parseInt(hex, 16);
  if (Number.isNaN(n)) return fallback;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function resolution(gl: WebGL2RenderingContext, base: number): { w: number; h: number } {
  let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspect < 1) aspect = 1 / aspect;
  const min = Math.round(base);
  const max = Math.round(base * aspect);
  return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;

export function initFluidField(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
): SplashFieldHandle | null {
  // Dev-only escape hatch: ?splashforce lets us run the sim on a software
  // renderer (e.g. headless SwiftShader) for visual QA. Compiled out of prod.
  const force =
    import.meta.env.DEV &&
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("splashforce");

  // Live-tunable feel params (dev only — exposed for console tweaking).
  const cfg = { ...TUNE_DEFAULTS };
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __splashTune?: typeof cfg }).__splashTune = cfg;
    console.info("[splash] live tune → window.__splashTune (edit values, applies next frame)");
  }

  const gl = canvas.getContext("webgl2", {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: "high-performance",
    // Return null instead of a slow software-rendered context.
    failIfMajorPerformanceCaveat: !force,
  });
  if (!gl) return null;

  // Float render targets are required for the simulation.
  if (!gl.getExtension("EXT_color_buffer_float")) return null;
  gl.getExtension("OES_texture_float_linear"); // best-effort: smoother advection

  // Reject known software renderers (some report a context despite the caveat flag).
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (!force && dbg) {
    const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
    if (SOFTWARE_RENDERER.test(renderer)) return null;
  }

  const vert = compile(gl, gl.VERTEX_SHADER, VERT);
  if (!vert) return null;

  const programs = {
    copy: makeProgram(gl, vert, FRAG_COPY),
    seed: makeProgram(gl, vert, FRAG_SEED),
    advect: makeProgram(gl, vert, FRAG_ADVECT),
    curl: makeProgram(gl, vert, FRAG_CURL),
    vorticity: makeProgram(gl, vert, FRAG_VORTICITY),
    divergence: makeProgram(gl, vert, FRAG_DIVERGENCE),
    clear: makeProgram(gl, vert, FRAG_CLEAR),
    diffuse: makeProgram(gl, vert, FRAG_DIFFUSE),
    regen: makeProgram(gl, vert, FRAG_REGEN),
    pressure: makeProgram(gl, vert, FRAG_PRESSURE),
    gradient: makeProgram(gl, vert, FRAG_GRADIENT),
    force: makeProgram(gl, vert, FRAG_FORCE),
    display: makeProgram(gl, vert, FRAG_DISPLAY),
  };
  if (Object.values(programs).some((p) => p === null)) return null;
  const P = programs as { [K in keyof typeof programs]: Program };

  // Fullscreen-triangle VAO (covers the screen; uv beyond 1 is clipped).
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const RG = { i: gl.RG16F, f: gl.RG };
  const R = { i: gl.R16F, f: gl.RED };
  const HF = gl.HALF_FLOAT;
  // All textures NEAREST — advection/display interpolate in-shader (bilerp), so we
  // never depend on hardware half-float linear filtering (unreliable on some GPUs).
  const NEAR = gl.NEAREST;

  let velocity: DoubleFBO;
  let dye: DoubleFBO;
  let pressure: DoubleFBO;
  let divergence: FBO;
  let curlFBO: FBO;
  let seedTex: FBO; // persistent copy of the marbled field — the self-heal target
  let simTexel: [number, number] = [0, 0];

  function allocate(): boolean {
    const sim = resolution(gl!, SIM_RES);
    const dyeRes = resolution(gl!, DYE_RES);
    const v = createDoubleFBO(gl!, sim.w, sim.h, RG.i, RG.f, HF, NEAR);
    const dy = createDoubleFBO(gl!, dyeRes.w, dyeRes.h, R.i, R.f, HF, NEAR);
    const pr = createDoubleFBO(gl!, sim.w, sim.h, R.i, R.f, HF, NEAR);
    const dv = createFBO(gl!, sim.w, sim.h, R.i, R.f, HF, NEAR);
    const cu = createFBO(gl!, sim.w, sim.h, R.i, R.f, HF, NEAR);
    const st = createFBO(gl!, dyeRes.w, dyeRes.h, R.i, R.f, HF, NEAR);
    if (!v || !dy || !pr || !dv || !cu || !st) return false;
    velocity = v;
    dye = dy;
    pressure = pr;
    divergence = dv;
    curlFBO = cu;
    seedTex = st;
    simTexel = [v.read.texelX, v.read.texelY];
    return true;
  }

  function setCanvasSize(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  setCanvasSize();
  if (!allocate()) return null;

  function blit(target: FBO | null): void {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, target ? target.fbo : null);
    if (target) gl!.viewport(0, 0, target.width, target.height);
    else gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  // ── Seed the marbled ink field once (a full, connected start) ───────────────
  // Render into the persistent seedTex (the self-heal target), then copy into the
  // live dye. A fixed offset keeps the reference pattern stable across re-seeds.
  const seedOffset: [number, number] = [Math.random() * 1000.0, Math.random() * 1000.0];
  function seed(): void {
    gl!.useProgram(P.seed.program);
    gl!.uniform2f(P.seed.uniforms.uSeed ?? null, seedOffset[0], seedOffset[1]);
    blit(seedTex);
    gl!.useProgram(P.copy.program);
    gl!.uniform1i(P.copy.uniforms.uTexture ?? null, seedTex.attach(0));
    blit(dye.write);
    dye.swap();
  }
  seed();

  // ── Theme ──────────────────────────────────────────────────────────────────
  let base: [number, number, number] = [0.1, 0.14, 0.18];
  let ink: [number, number, number] = [0.03, 0.05, 0.08];
  function syncTheme(): void {
    const cs = getComputedStyle(document.documentElement);
    base = parseHex(cs.getPropertyValue("--splash-base"), base);
    ink = parseHex(cs.getPropertyValue("--splash-ink"), ink);
    const lo = Number.parseFloat(cs.getPropertyValue("--splash-ink-lo"));
    const hi = Number.parseFloat(cs.getPropertyValue("--splash-ink-hi"));
    if (!Number.isNaN(lo)) cfg.inkLo = lo;
    if (!Number.isNaN(hi)) cfg.inkHi = hi;
  }
  syncTheme();

  // ── Pointer ────────────────────────────────────────────────────────────────
  const pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0 }; // dx/dy = decaying stir impulse
  let lastPx = 0.5;
  let lastPy = 0.5;
  function onPointerMove(e: PointerEvent): void {
    const x = e.clientX / Math.max(window.innerWidth, 1);
    const y = 1 - e.clientY / Math.max(window.innerHeight, 1);
    // Accumulate clamped movement — the clamp prevents fast-flick velocity spikes
    // (the "sudden" feel); the per-frame decay (in step) gives a smooth ramp-down.
    pointer.dx += Math.max(-POINTER_MAX_DELTA, Math.min(POINTER_MAX_DELTA, x - lastPx));
    pointer.dy += Math.max(-POINTER_MAX_DELTA, Math.min(POINTER_MAX_DELTA, y - lastPy));
    lastPx = x;
    lastPy = y;
    pointer.x = x;
    pointer.y = y;
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // ── Simulation step ──────────────────────────────────────────────────────────
  let time = 0;
  function step(dt: number): void {
    gl!.disable(gl!.BLEND);
    gl!.bindVertexArray(vao);

    // 1) Forces: ambient curl-noise base flow + pointer drag/vortex. Pre-projection,
    //    so the push becomes a swirling wake.
    gl!.useProgram(P.force.program);
    gl!.uniform2f(P.force.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.force.uniforms.uVelocity ?? null, velocity.read.attach(0));
    gl!.uniform1f(P.force.uniforms.dt ?? null, dt);
    gl!.uniform1f(P.force.uniforms.uNoiseScale ?? null, cfg.noiseScale);
    gl!.uniform2f(
      P.force.uniforms.uNoiseOffset ?? null,
      time * cfg.noiseDrift,
      time * -cfg.noiseDrift * 0.95,
    );
    gl!.uniform1f(P.force.uniforms.uNoiseEps ?? null, 0.0025 * cfg.noiseScale);
    // ease the ambient force in over the first ~1.5s so the field starts calm and
    // settles into motion (no fast lurch on page load).
    const ramp = Math.min(time / 1.5, 1.0);
    gl!.uniform1f(P.force.uniforms.uNoiseAmp ?? null, cfg.noiseAmp * ramp);
    gl!.uniform2f(P.force.uniforms.uPointer ?? null, pointer.x, pointer.y);
    gl!.uniform2f(P.force.uniforms.uPointerDelta ?? null, pointer.dx, pointer.dy);
    gl!.uniform1f(P.force.uniforms.uPointerPush ?? null, cfg.pointerPush);
    gl!.uniform1f(P.force.uniforms.uPointerSwirl ?? null, cfg.pointerSwirl);
    gl!.uniform1f(P.force.uniforms.uPointerRadius ?? null, cfg.pointerRadius);
    gl!.uniform1f(P.force.uniforms.uAspect ?? null, canvas.width / canvas.height);
    blit(velocity.write);
    velocity.swap();
    pointer.dx *= cfg.pointerDecay;
    pointer.dy *= cfg.pointerDecay;

    // 2) Vorticity confinement (PavelDoGreat): measure curl, then push velocity to
    //    sharpen swirls — the lively folding that keeps ink as tendrils, not flat grey.
    gl!.useProgram(P.curl.program);
    gl!.uniform2f(P.curl.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.curl.uniforms.uVelocity ?? null, velocity.read.attach(0));
    blit(curlFBO);

    gl!.useProgram(P.vorticity.program);
    gl!.uniform2f(P.vorticity.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.vorticity.uniforms.uVelocity ?? null, velocity.read.attach(0));
    gl!.uniform1i(P.vorticity.uniforms.uCurl ?? null, curlFBO.attach(1));
    gl!.uniform1f(P.vorticity.uniforms.uCurlAmt ?? null, cfg.curl);
    gl!.uniform1f(P.vorticity.uniforms.dt ?? null, dt);
    blit(velocity.write);
    velocity.swap();

    // 3) Projection: make velocity divergence-free (keeps the rotational swirl).
    gl!.useProgram(P.divergence.program);
    gl!.uniform2f(P.divergence.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.divergence.uniforms.uVelocity ?? null, velocity.read.attach(0));
    blit(divergence);

    // decay carried-over pressure, then Jacobi-solve
    gl!.useProgram(P.clear.program);
    gl!.uniform1i(P.clear.uniforms.uTexture ?? null, pressure.read.attach(0));
    gl!.uniform1f(P.clear.uniforms.uValue ?? null, cfg.pressureDecay);
    blit(pressure.write);
    pressure.swap();

    gl!.useProgram(P.pressure.program);
    gl!.uniform2f(P.pressure.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.pressure.uniforms.uDivergence ?? null, divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITERS; i++) {
      gl!.uniform1i(P.pressure.uniforms.uPressure ?? null, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gl!.useProgram(P.gradient.program);
    gl!.uniform2f(P.gradient.uniforms.texelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.gradient.uniforms.uPressure ?? null, pressure.read.attach(0));
    gl!.uniform1i(P.gradient.uniforms.uVelocity ?? null, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    // 4) Advection: move velocity, then ink, along the flow.
    gl!.useProgram(P.advect.program);
    gl!.uniform2f(P.advect.uniforms.uTexelSize ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1f(P.advect.uniforms.dt ?? null, dt);
    // velocity self-advection (source = velocity, sim resolution)
    gl!.uniform2f(P.advect.uniforms.uSourceTexel ?? null, simTexel[0], simTexel[1]);
    gl!.uniform1i(P.advect.uniforms.uVelocity ?? null, velocity.read.attach(0));
    gl!.uniform1i(P.advect.uniforms.uSource ?? null, velocity.read.attach(0));
    gl!.uniform1f(P.advect.uniforms.dissipation ?? null, cfg.velocityDissipation);
    blit(velocity.write);
    velocity.swap();
    // dye advection (source = dye, dye resolution)
    gl!.uniform2f(P.advect.uniforms.uSourceTexel ?? null, dye.texelX, dye.texelY);
    gl!.uniform1i(P.advect.uniforms.uVelocity ?? null, velocity.read.attach(0));
    gl!.uniform1i(P.advect.uniforms.uSource ?? null, dye.read.attach(1));
    gl!.uniform1f(P.advect.uniforms.dissipation ?? null, DYE_DISSIPATION);
    blit(dye.write);
    dye.swap();

    // dye diffusion — bleed/soften the ink toward its neighbours (ink in water).
    if (cfg.dyeDiffuse > 0) {
      gl!.useProgram(P.diffuse.program);
      gl!.uniform2f(P.diffuse.uniforms.texelSize ?? null, dye.texelX, dye.texelY);
      gl!.uniform1f(P.diffuse.uniforms.uK ?? null, Math.min(cfg.dyeDiffuse * dt * 60.0, 0.5));
      gl!.uniform1i(P.diffuse.uniforms.uDye ?? null, dye.read.attach(0));
      blit(dye.write);
      dye.swap();
    }

    // self-heal — pull the dye gently back toward the marbled reference so stirring
    // can never smear the ink away (cleared areas refill over a few seconds).
    if (cfg.regen > 0) {
      gl!.useProgram(P.regen.program);
      gl!.uniform1i(P.regen.uniforms.uDye ?? null, dye.read.attach(0));
      gl!.uniform1i(P.regen.uniforms.uSeedTex ?? null, seedTex.attach(1));
      gl!.uniform1f(P.regen.uniforms.uRate ?? null, Math.min(cfg.regen * dt * 60.0, 0.5));
      blit(dye.write);
      dye.swap();
    }
  }

  function render(): void {
    gl!.useProgram(P.display.program);
    gl!.uniform1i(P.display.uniforms.uDye ?? null, dye.read.attach(0));
    gl!.uniform2f(P.display.uniforms.uDyeTexel ?? null, dye.texelX, dye.texelY);
    gl!.uniform3f(P.display.uniforms.uBase ?? null, base[0], base[1], base[2]);
    gl!.uniform3f(P.display.uniforms.uInk ?? null, ink[0], ink[1], ink[2]);
    gl!.uniform1f(P.display.uniforms.uInkLo ?? null, cfg.inkLo);
    gl!.uniform1f(P.display.uniforms.uInkHi ?? null, cfg.inkHi);
    blit(null);
  }

  // ── Resize (debounced; sim grids realloc + re-seed on aspect change) ────────
  let resizeTimer = 0;
  function onResize(): void {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (setCanvasSize()) {
        if (allocate()) seed();
      }
    }, 250);
  }
  window.addEventListener("resize", onResize, { passive: true });

  // ── Loop + FPS guard ────────────────────────────────────────────────────────
  let raf = 0;
  let disposed = false;
  let prev = 0;
  let warmStart = 0;
  let frames = 0;
  let bailed = false;

  function bail(): void {
    bailed = true;
    canvas.style.opacity = "0";
    layer.classList.remove("is-splash-field-ready");
    layer.classList.add("is-splash-still");
    dispose();
  }

  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (document.visibilityState !== "visible") {
      prev = now;
      return;
    }
    if (!prev) {
      prev = now;
      warmStart = now;
      return;
    }
    const dt = Math.min((now - prev) / 1000, 0.022);
    prev = now;
    time += dt;
    step(dt);
    render();

    frames++;
    if (warmStart && now - warmStart > FPS_WARMUP_MS) {
      const fps = (frames * 1000) / (now - warmStart);
      if (!force && fps < FPS_BAIL) {
        bail();
        return;
      }
      warmStart = 0; // guard satisfied; stop measuring
    }
  }

  function onContextLost(e: Event): void {
    e.preventDefault();
    bail();
  }
  canvas.addEventListener("webglcontextlost", onContextLost);

  // Pre-develop the seeded masses so the field appears already gently diffused
  // (the cursor isn't here yet — the ambient flow + vorticity do the folding).
  for (let i = 0; i < WARMUP_STEPS; i++) {
    time += 0.016;
    step(0.016);
  }

  layer.classList.add("is-splash-field-ready");
  raf = requestAnimationFrame(frame);

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(resizeTimer);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    if (!gl) return;
    for (const p of Object.values(P)) gl.deleteProgram(p.program);
    for (const f of [
      velocity?.read,
      velocity?.write,
      dye?.read,
      dye?.write,
      pressure?.read,
      pressure?.write,
      divergence,
      curlFBO,
      seedTex,
    ]) {
      if (f) {
        gl.deleteTexture(f.texture);
        gl.deleteFramebuffer(f.fbo);
      }
    }
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
  }

  return {
    dispose,
    syncTheme: () => {
      if (!bailed) syncTheme();
    },
  };
}
