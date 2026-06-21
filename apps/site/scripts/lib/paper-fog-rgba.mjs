/** Production paper-fog splash still — shared by draft lab and splash-still bake. */

export const PAPER_FOG_WIDTH = 1920;
export const PAPER_FOG_HEIGHT = 1080;

const SEED = 0x9e3779b9;

function hash(x, y) {
  let h = SEED ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
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

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function writePixel(data, width, x, y, rgb) {
  const i = (y * width + x) * 4;
  data[i] = clampByte(rgb[0]);
  data[i + 1] = clampByte(rgb[1]);
  data[i + 2] = clampByte(rgb[2]);
  data[i + 3] = 255;
}

/** @returns {Uint8Array} RGBA paper-fog frame. */
export function bakePaperFogRgba() {
  const data = new Uint8Array(PAPER_FOG_WIDTH * PAPER_FOG_HEIGHT * 4);
  const top = [18, 20, 32];
  const bottom = [11, 12, 21];
  const fiberAmount = 32;
  const fineAmount = 9;
  const bandRgb = [24, 32, 48];
  const bandAlpha = 0.085;

  for (let y = 0; y < PAPER_FOG_HEIGHT; y++) {
    for (let x = 0; x < PAPER_FOG_WIDTH; x++) {
      const u = x / PAPER_FOG_WIDTH;
      const v = y / PAPER_FOG_HEIGHT;
      let rgb = lerpRgb(top, bottom, v ** 0.88);
      const fiber = (fbm(x * 0.0035, y * 0.011, 5) - 0.5) * fiberAmount;
      const fine = (fbm(x * 0.013, y * 0.038, 3) - 0.5) * fineAmount;
      const g = grain(x, y, 3.5);
      const texture = fiber + fine + g;
      rgb = [rgb[0] + texture * 0.88, rgb[1] + texture * 0.94, rgb[2] + texture * 1.02];

      const band = Math.exp(-((v - 0.62) ** 2) / 0.019) * bandAlpha;
      rgb = [
        lerp(rgb[0], bandRgb[0], band),
        lerp(rgb[1], bandRgb[1], band),
        lerp(rgb[2], bandRgb[2], band),
      ];

      rgb = [lerp(rgb[0], 10, 0.04), lerp(rgb[1], 13, 0.06), lerp(rgb[2], 28, 0.12)];

      const vig = vignette(u, v, 0.18);
      rgb = [rgb[0] * vig, rgb[1] * vig, rgb[2] * vig];
      writePixel(data, PAPER_FOG_WIDTH, x, y, rgb);
    }
  }

  return data;
}
