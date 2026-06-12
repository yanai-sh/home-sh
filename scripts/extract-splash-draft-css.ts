import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const raw = readFileSync(path.join(root, "docs/splash-drafts/boot-index.html"), "utf8");
const match = raw.match(/<style>([\s\S]*?)<\/style>/);
if (!match) throw new Error("style block not found");

let css = match[1]
  .replace(/\.lattice\s*\{[\s\S]*?\}\s*\.lattice canvas\s*\{[\s\S]*?\}/, "")
  .replace(/\bbody\s*\{/, ".splash-body {")
  .replace(/\.lattice/g, ".systems-field-layer.splash-field");

css += `
.systems-field-layer.splash-field {
  position: fixed;
  inset: 0;
  z-index: 0;
  clip-path: inset(0 calc((1 - var(--split-progress, 0)) * 100%) 0 0);
  transition: opacity 0.8s var(--ease);
  pointer-events: none;
}

.systems-field-layer.splash-field canvas {
  width: 100%;
  height: 100%;
  display: block;
}
`;

const out = path.join(root, "apps/site/src/styles/splash.css");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${css.trim()}\n`);
console.log(`wrote ${out}`);
