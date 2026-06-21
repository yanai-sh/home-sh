/**
 * Bake static splash background drafts for the lab picker.
 * Usage: node apps/site/scripts/bake-splash-drafts.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { bakePaperFogRgba } from "./lib/paper-fog-rgba.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/splash-drafts");
mkdirSync(outDir, { recursive: true });

const require = createRequire(import.meta.url);
const WIDTH = 1920;
const HEIGHT = 1080;

const SEED = 0x9e3779b9;
function hash(x, y) {
  let h = SEED ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function vignette(u, v, strength = 0.35) {
  const dx = u - 0.5;
  const dy = v - 0.52;
  return 1 - (dx * dx + dy * dy) * strength;
}

function grain(x, y, amount) {
  return (hash(x, y) - 0.5) * amount;
}

function valueNoise(x, y) {
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
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

function writePixel(data, width, x, y, rgb) {
  const i = (y * width + x) * 4;
  data[i] = clampByte(rgb[0]);
  data[i + 1] = clampByte(rgb[1]);
  data[i + 2] = clampByte(rgb[2]);
  data[i + 3] = 255;
}

/** Near-flat void + grain + soft vignette. */
function bakeObsidian(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const top = dark ? [5, 8, 14] : [238, 234, 226];
  const bottom = dark ? [8, 10, 14] : [244, 240, 234];

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let rgb = lerpRgb(top, bottom, v ** 0.85);
      const g = grain(x, y, dark ? 4 : 3);
      rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g];
      const vig = vignette(u, v, dark ? 0.28 : 0.18);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

/** Soft elliptical spotlight behind the hero stage — empty set, not a grid. */
function bakeStudio(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const base = dark ? [5, 8, 12] : [242, 238, 230];
  const spot = dark ? [52, 50, 46] : [255, 252, 246];
  const spotAlpha = dark ? 0.14 : 0.1;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let rgb = [...base];
      const g = grain(x, y, dark ? 2.5 : 2);
      rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g];

      const ex = (u - 0.28) / 0.44;
      const ey = (v - 0.36) / 0.4;
      const light = Math.exp(-(ex * ex + ey * ey)) * spotAlpha;
      rgb = [
        lerp(rgb[0], spot[0], light),
        lerp(rgb[1], spot[1], light),
        lerp(rgb[2], spot[2], light),
      ];

      const vig = vignette(u, v, dark ? 0.3 : 0.18);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

/** Horizontal fog band — abstract distance, no lines or patterns. */
function bakeHorizon(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const top = dark ? [4, 7, 12] : [236, 232, 224];
  const bottom = dark ? [6, 8, 11] : [244, 240, 234];
  const bandRgb = dark ? [28, 36, 48] : [214, 208, 198];
  const bandAlpha = dark ? 0.09 : 0.07;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let rgb = lerpRgb(top, bottom, v ** 0.9);
      const g = grain(x, y, dark ? 3 : 2.5);
      rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g];

      const band = Math.exp(-((v - 0.63) ** 2) / 0.016) * bandAlpha;
      rgb = [
        lerp(rgb[0], bandRgb[0], band),
        lerp(rgb[1], bandRgb[1], band),
        lerp(rgb[2], bandRgb[2], band),
      ];

      const vig = vignette(u, v, dark ? 0.26 : 0.16);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

/** Warm charcoal paper — fiber noise, editorial matte. */
function bakeCharcoal(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const base = dark ? [24, 22, 20] : [228, 222, 214];
  const fiberAmount = dark ? 14 : 10;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let rgb = [...base];
      const fiber = (fbm(x * 0.004, y * 0.012, 5) - 0.5) * fiberAmount;
      const g = grain(x, y, dark ? 3 : 2.5);
      rgb = [rgb[0] + fiber + g, rgb[1] + fiber + g, rgb[2] + fiber + g];

      const vig = vignette(u, v, dark ? 0.24 : 0.14);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

/** Charcoal paper + horizon fog — uses shared production paper-fog bake. */
function bakePaperFog() {
  return bakePaperFogRgba();
}

/** Cinematic vertical wash — navy twilight, no decorative motifs. */
function bakeTwilight(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const top = dark ? [6, 10, 22] : [228, 232, 242];
  const mid = dark ? [14, 22, 32] : [236, 238, 244];
  const bottom = dark ? [3, 4, 8] : [248, 246, 242];

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      const upper = lerpRgb(top, mid, smoothstep(0.08, 0.52, v));
      let rgb = lerpRgb(upper, bottom, smoothstep(0.48, 0.96, v));
      const g = grain(x, y, dark ? 3 : 2.5);
      rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g];

      const vig = vignette(u, v, dark ? 0.22 : 0.12);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

/** Asymmetric warm rim from upper-left. */
function bakeWarmRim(theme) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const dark = theme === "dark";
  const base = dark ? [5, 8, 12] : [242, 238, 230];
  const warm = dark ? [255, 205, 118] : [201, 142, 58];
  const warmAlpha = dark ? 0.11 : 0.08;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      let rgb = [...base];
      const g = grain(x, y, dark ? 2 : 1.5);
      rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g];

      const dx = u + 0.08;
      const dy = v + 0.06;
      const rim = Math.exp(-(dx * dx * 2.4 + dy * dy * 3.2)) * warmAlpha;
      rgb = [lerp(rgb[0], warm[0], rim), lerp(rgb[1], warm[1], rim), lerp(rgb[2], warm[2], rim)];

      const vig = vignette(u, v, dark ? 0.32 : 0.2);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, WIDTH, x, y, rgb);
    }
  }
  return data;
}

async function writeWebp(path, rgba, width, height) {
  const sharp = require("sharp");
  await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
    .webp({ quality: 84 })
    .toFile(path);
}

async function writeJpg(path, rgba, width, height) {
  const sharp = require("sharp");
  await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
    .jpeg({ quality: 88 })
    .toFile(path);
}

const bakers = {
  obsidian: bakeObsidian,
  studio: bakeStudio,
  horizon: bakeHorizon,
  charcoal: bakeCharcoal,
  "paper-fog": bakePaperFog,
  twilight: bakeTwilight,
  "warm-rim": bakeWarmRim,
};

for (const [slug, bake] of Object.entries(bakers)) {
  const data = slug === "paper-fog" ? bake() : bake("dark");
  const base = join(outDir, slug);
  try {
    await writeWebp(`${base}.webp`, data, WIDTH, HEIGHT);
    await writeJpg(`${base}.jpg`, data, WIDTH, HEIGHT);
    console.log(`[bake-splash-drafts] wrote ${slug}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[bake-splash-drafts] sharp required: ${message}`);
    process.exit(1);
  }
}
