/**
 * Bake production splash still from paper-fog (no dev server required).
 * Usage: node apps/site/scripts/bake-splash-stills.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { PAPER_FOG_HEIGHT, PAPER_FOG_WIDTH, bakePaperFogRgba } from "./lib/paper-fog-rgba.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
mkdirSync(publicDir, { recursive: true });

const require = createRequire(import.meta.url);

async function writePng(path, rgba, width, height) {
  try {
    const sharp = require("sharp");
    await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
      .png()
      .toFile(path);
    return true;
  } catch {
    return false;
  }
}

async function writeWebp(path, rgba, width, height) {
  try {
    const sharp = require("sharp");
    await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
      .webp({ quality: 84 })
      .toFile(path);
    return true;
  } catch {
    return false;
  }
}

async function writeJpg(path, rgba, width, height) {
  try {
    const sharp = require("sharp");
    await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
      .jpeg({ quality: 88 })
      .toFile(path);
    return true;
  } catch {
    return false;
  }
}

const data = bakePaperFogRgba();
const width = PAPER_FOG_WIDTH;
const height = PAPER_FOG_HEIGHT;
const base = join(publicDir, "splash-still-dark");

const pngOk = await writePng(`${base}.png`, data, width, height);
const webpOk = await writeWebp(`${base}.webp`, data, width, height);
const jpgOk = await writeJpg(`${base}.jpg`, data, width, height);

if (!pngOk && !webpOk && !jpgOk) {
  console.warn("[bake-splash-stills] sharp not installed — keep existing splash-still-dark.*");
  process.exit(1);
}

console.log(`[bake-splash-stills] wrote splash-still-dark (${width}x${height}, paper-fog)`);
