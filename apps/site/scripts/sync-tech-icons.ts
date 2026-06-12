#!/usr/bin/env tsx
/**
 * Extract a fixed list of simple-icons SVGs into `src/icons/` for build-time
 * inlining in `lib/icons.tsx`. The Cloudflare Worker runtime has no filesystem,
 * so icons must be vendored as static assets.
 *
 * Re-run from repo root: `pnpm exec tsx apps/site/scripts/sync-tech-icons.ts`
 * (after adding names here; requires `@iconify-json/simple-icons` in the workspace).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = [
  'python',
  'cplusplus',
  'c',
  'dotnet',
  'gnubash',
  'powershell',
  'docker',
  'githubactions',
  'gitlab',
  'linux',
  'elasticsearch',
  'apachekafka',
  'apachenifi',
  'apachespark',
  'mysql',
] as const;

type IconBody = { body: string; width?: number; height?: number };
type Pack = {
  icons: Record<string, IconBody>;
  width?: number;
  height?: number;
};

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'src', 'icons');
mkdirSync(outDir, { recursive: true });

const packPath = '@iconify-json/simple-icons/icons.json';
const pack = (await import(packPath, { with: { type: 'json' } })).default as Pack;
const defaultW = pack.width ?? 24;
const defaultH = pack.height ?? 24;

const missing: string[] = [];
for (const name of NAMES) {
  const ic = pack.icons[name];
  if (!ic) {
    missing.push(name);
    continue;
  }
  const vw = ic.width ?? defaultW;
  const vh = ic.height ?? defaultH;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" fill="currentColor">${ic.body}</svg>\n`;
  writeFileSync(resolve(outDir, `${name}.svg`), svg);
  console.log(`wrote ${name}`);
}

if (missing.length > 0) {
  throw new Error(`Missing simple-icons entries: ${missing.join(', ')}`);
}
