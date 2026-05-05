#!/usr/bin/env bun
/**
 * Cloudflare Pages reserves the ASSETS binding. @astrojs/cloudflare may emit
 * `assets.binding` in dist wrangler.json (see astro#16107). Wrangler local
 * dev rejects it; deploy CI strips with jq — this mirrors that for `preview`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function collectWranglerJsonFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) collectWranglerJsonFiles(full, out);
    else if (ent.name === 'wrangler.json') out.push(full);
  }
  return out;
}

const distRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const files = collectWranglerJsonFiles(distRoot);

for (const file of files) {
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as { assets?: { binding?: string } };
  if (parsed.assets !== undefined && 'binding' in parsed.assets) {
    delete parsed.assets.binding;
    writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
    console.warn(`stripped assets.binding from ${file}`);
  }
}
