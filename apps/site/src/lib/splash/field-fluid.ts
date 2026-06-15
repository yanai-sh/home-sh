/**
 * WebGL2 fluid simulation (Navier-Stokes) — interactive "paint in water" splash.
 * The pointer injects and stirs dye that advects, curls (vorticity) and stays
 * divergence-free via a Jacobi pressure solve. Periodic auto-splats keep it
 * alive at rest. Returns null when WebGL2 / float render targets are
 * unavailable so the Canvas 2D fallback can take over (see field.ts).
 *
 * Algorithm after Pavel Dobryakov's WebGL-Fluid-Simulation (MIT), trimmed.
 */

import type { SplashFieldHandle } from './field';

type Rgb = [number, number, number];

const SIM_RES = 128;
const DYE_RES = 640;
const VELOCITY_DISSIPATION = 0.2;
const DENSITY_DISSIPATION = 0.96;
const PRESSURE_DECAY = 0.8;
const PRESSURE_ITERATIONS = 18;
const CURL_STRENGTH = 28;
const SPLAT_RADIUS = 0.22; // relative to the larger dimension
const SPLAT_FORCE = 5400;
const AUTO_SPLAT_MS = 750; // periodic ambient splats so it flows at rest
const SEED_SPLATS = 12; // initial splats so it's alive on first paint
const POINTER_REST_X = 0.74;
const POINTER_REST_Y = 0.4;

const BASE_VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const frag = (body: string): string => `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
${body}`;

const COPY_FRAG = frag(`
uniform sampler2D uTexture;
void main() { fragColor = texture(uTexture, vUv); }`);

const CLEAR_FRAG = frag(`
uniform sampler2D uTexture;
uniform float value;
void main() { fragColor = value * texture(uTexture, vUv); }`);

const SPLAT_FRAG = frag(`
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main() {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`);

const ADVECTION_FRAG = frag(`
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  fragColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`);

const DIVERGENCE_FRAG = frag(`
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`);

const CURL_FRAG = frag(`
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`);

const VORTICITY_FRAG = frag(`
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy;
  fragColor = vec4(vel + force * dt, 0.0, 1.0);
}`);

const PRESSURE_FRAG = frag(`
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`);

const GRADIENT_FRAG = frag(`
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`);

const DISPLAY_FRAG = frag(`
uniform sampler2D uDye;
uniform vec3 uBg;
uniform float uLight;
void main() {
  vec3 dye = texture(uDye, vUv).rgb;
  vec3 glow = uBg + dye;       // additive glow (dark theme)
  vec3 ink = uBg - dye;        // subtractive ink (light theme)
  fragColor = vec4(mix(glow, ink, uLight), 1.0);
}`);

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

type Prog = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

function program(gl: WebGL2RenderingContext, vsrc: string, fsrc: string): Prog | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vsrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { program: p, uniforms };
}

type Fbo = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
  attach: (id: number) => number;
};

export function initFluidField(canvas: HTMLCanvasElement, layer: HTMLElement): SplashFieldHandle | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;
  if (!gl.getExtension('EXT_color_buffer_float')) return null;
  gl.getExtension('OES_texture_float_linear');

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const makeFbo = (w: number, h: number, internal: number, format: number, filter: number): Fbo | null => {
    const texture = gl.createTexture();
    if (!texture) return null;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer();
    if (!fbo) return null;
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
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  };

  const makeDouble = (w: number, h: number, internal: number, format: number, filter: number) => {
    let a = makeFbo(w, h, internal, format, filter);
    let b = makeFbo(w, h, internal, format, filter);
    if (!a || !b) return null;
    return {
      get read() {
        return a as Fbo;
      },
      get write() {
        return b as Fbo;
      },
      swap() {
        const t = a;
        a = b;
        b = t;
      },
    };
  };

  const L = gl.LINEAR;
  const N = gl.NEAREST;
  const velocity = makeDouble(SIM_RES, SIM_RES, gl.RG16F, gl.RG, L);
  const dye = makeDouble(DYE_RES, DYE_RES, gl.RGBA16F, gl.RGBA, L);
  const pressure = makeDouble(SIM_RES, SIM_RES, gl.R16F, gl.RED, N);
  const divergence = makeFbo(SIM_RES, SIM_RES, gl.R16F, gl.RED, N);
  const curl = makeFbo(SIM_RES, SIM_RES, gl.R16F, gl.RED, N);

  const progs = {
    copy: program(gl, BASE_VERT, COPY_FRAG),
    clear: program(gl, BASE_VERT, CLEAR_FRAG),
    splat: program(gl, BASE_VERT, SPLAT_FRAG),
    advection: program(gl, BASE_VERT, ADVECTION_FRAG),
    divergence: program(gl, BASE_VERT, DIVERGENCE_FRAG),
    curl: program(gl, BASE_VERT, CURL_FRAG),
    vorticity: program(gl, BASE_VERT, VORTICITY_FRAG),
    pressure: program(gl, BASE_VERT, PRESSURE_FRAG),
    gradient: program(gl, BASE_VERT, GRADIENT_FRAG),
    display: program(gl, BASE_VERT, DISPLAY_FRAG),
  };

  if (
    !velocity ||
    !dye ||
    !pressure ||
    !divergence ||
    !curl ||
    Object.values(progs).some((p) => p === null)
  ) {
    return null;
  }

  const blit = (target: Fbo | null): void => {
    if (target) {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const use = (p: Prog): Prog => {
    gl.useProgram(p.program);
    return p;
  };

  // Theme colours.
  let bg: Rgb = [0.082, 0.106, 0.133];
  let palette: Rgb[] = [
    [0.18, 0.34, 1.0],
    [0.1, 0.62, 0.55],
    [0.95, 0.62, 0.2],
  ];
  let isLight = false;
  const parseHex = (raw: string, fb: Rgb): Rgb => {
    const hex = raw.trim().replace('#', '');
    if (hex.length !== 6) return fb;
    const n = Number.parseInt(hex, 16);
    if (Number.isNaN(n)) return fb;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const readRgb = (name: string, fb: Rgb): Rgb => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw.startsWith('#') ? parseHex(raw, fb) : fb;
  };
  const syncTheme = (): void => {
    bg = readRgb('--color-background', bg);
    palette = [
      readRgb('--color-accent-text', palette[0]),
      readRgb('--color-ok', palette[1]),
      readRgb('--color-accent-warm', palette[2]),
    ];
    isLight = document.documentElement.dataset.theme === 'light';
  };
  syncTheme();

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  resize();

  let colorIndex = 0;
  const splat = (x: number, y: number, dx: number, dy: number, color: Rgb): void => {
    const aspect = canvas.width / canvas.height;
    const radius = SPLAT_RADIUS / 100;
    let p = use(progs.splat as Prog);
    gl.uniform1i(p.uniforms.uTarget, (velocity as NonNullable<typeof velocity>).read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, aspect);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, dx, dy, 0);
    gl.uniform1f(p.uniforms.radius, radius * aspect);
    blit((velocity as NonNullable<typeof velocity>).write);
    (velocity as NonNullable<typeof velocity>).swap();

    p = use(progs.splat as Prog);
    gl.uniform1i(p.uniforms.uTarget, (dye as NonNullable<typeof dye>).read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, aspect);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, color[0], color[1], color[2]);
    gl.uniform1f(p.uniforms.radius, radius * aspect);
    blit((dye as NonNullable<typeof dye>).write);
    (dye as NonNullable<typeof dye>).swap();
  };

  const vel = velocity as NonNullable<typeof velocity>;
  const dy = dye as NonNullable<typeof dye>;
  const pr = pressure as NonNullable<typeof pressure>;
  const div = divergence as Fbo;
  const cu = curl as Fbo;

  const setTexel = (p: Prog, fbo: Fbo): void => {
    gl.uniform2f(p.uniforms.texelSize, fbo.texelX, fbo.texelY);
  };

  const step = (dt: number): void => {
    gl.disable(gl.BLEND);

    let p = use(progs.curl as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(0));
    blit(cu);

    p = use(progs.vorticity as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(p.uniforms.uCurl, cu.attach(1));
    gl.uniform1f(p.uniforms.curl, CURL_STRENGTH);
    gl.uniform1f(p.uniforms.dt, dt);
    blit(vel.write);
    vel.swap();

    p = use(progs.divergence as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(0));
    blit(div);

    p = use(progs.clear as Prog);
    gl.uniform1i(p.uniforms.uTexture, pr.read.attach(0));
    gl.uniform1f(p.uniforms.value, PRESSURE_DECAY);
    blit(pr.write);
    pr.swap();

    p = use(progs.pressure as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uDivergence, div.attach(0));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(p.uniforms.uPressure, pr.read.attach(1));
      blit(pr.write);
      pr.swap();
    }

    p = use(progs.gradient as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uPressure, pr.read.attach(0));
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(1));
    blit(vel.write);
    vel.swap();

    p = use(progs.advection as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, vel.read.attach(0));
    gl.uniform1f(p.uniforms.dt, dt);
    gl.uniform1f(p.uniforms.dissipation, VELOCITY_DISSIPATION);
    blit(vel.write);
    vel.swap();

    p = use(progs.advection as Prog);
    setTexel(p, vel.read);
    gl.uniform1i(p.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(p.uniforms.uSource, dy.read.attach(1));
    gl.uniform1f(p.uniforms.dt, dt);
    gl.uniform1f(p.uniforms.dissipation, DENSITY_DISSIPATION);
    blit(dy.write);
    dy.swap();
  };

  const renderDisplay = (): void => {
    const p = use(progs.display as Prog);
    gl.uniform1i(p.uniforms.uDye, dy.read.attach(0));
    gl.uniform3f(p.uniforms.uBg, bg[0], bg[1], bg[2]);
    gl.uniform1f(p.uniforms.uLight, isLight ? 1 : 0);
    blit(null);
  };

  // Pointer state.
  const pointer = { x: POINTER_REST_X, y: POINTER_REST_Y, px: POINTER_REST_X, py: POINTER_REST_Y, moved: false };
  let visible = true;
  let disposed = false;
  let raf = 0;
  let lastTime = 0;
  let autoTimer = 0;

  const themedColor = (): Rgb => {
    const c = palette[colorIndex % palette.length];
    colorIndex++;
    const gain = isLight ? 0.16 : 0.3;
    return [c[0] * gain, c[1] * gain, c[2] * gain];
  };

  const autoSplat = (): void => {
    const x = 0.55 + Math.random() * 0.4; // right-leaning, away from hero text
    const y = 0.25 + Math.random() * 0.5;
    const a = Math.random() * Math.PI * 2;
    const f = SPLAT_FORCE * 0.5;
    splat(x, y, Math.cos(a) * f, Math.sin(a) * f, themedColor());
  };

  const render = (now: number): void => {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (!visible || document.visibilityState !== 'visible') {
      lastTime = now;
      return;
    }
    const dt = Math.min(0.016, lastTime ? (now - lastTime) / 1000 : 0.016) || 0.016;
    lastTime = now;

    if (pointer.moved) {
      pointer.moved = false;
      const dx = (pointer.x - pointer.px) * SPLAT_FORCE;
      const dy2 = (pointer.y - pointer.py) * SPLAT_FORCE;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      if (Math.abs(dx) + Math.abs(dy2) > 1) splat(pointer.x, pointer.y, dx, dy2, themedColor());
    }
    autoTimer += dt * 1000;
    if (autoTimer >= AUTO_SPLAT_MS) {
      autoTimer = 0;
      autoSplat();
    }

    step(dt);
    renderDisplay();
  };

  const onMove = (e: PointerEvent): void => {
    pointer.x = e.clientX / Math.max(window.innerWidth, 1);
    pointer.y = 1 - e.clientY / Math.max(window.innerHeight, 1);
    pointer.moved = true;
    document.documentElement.style.setProperty('--pointer-x', String(e.clientX / window.innerWidth));
    document.documentElement.style.setProperty('--pointer-y', String(e.clientY / window.innerHeight));
  };
  const onDown = (e: PointerEvent): void => {
    if (
      e.target instanceof Element &&
      e.target.closest('button, a, input, textarea, select, label')
    ) {
      return;
    }
    const x = e.clientX / Math.max(window.innerWidth, 1);
    const y = 1 - e.clientY / Math.max(window.innerHeight, 1);
    const a = Math.random() * Math.PI * 2;
    splat(x, y, Math.cos(a) * SPLAT_FORCE, Math.sin(a) * SPLAT_FORCE, themedColor());
  };
  const onResize = (): void => resize();
  const onContextLost = (e: Event): void => {
    e.preventDefault();
    disposed = true;
    cancelAnimationFrame(raf);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.01 },
  );

  // Seed splats so it's alive immediately, then run.
  for (let i = 0; i < SEED_SPLATS; i++) autoSplat();
  renderDisplay();
  layer.classList.add('is-splash-field-ready');

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  canvas.addEventListener('webglcontextlost', onContextLost);
  observer.observe(layer);
  raf = requestAnimationFrame(render);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
    },
    syncTheme,
  };
}
