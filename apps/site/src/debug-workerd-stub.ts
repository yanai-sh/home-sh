/**
 * `debug` is CommonJS and references `module` — incompatible with Cloudflare workerd dev.
 * `@iconify/tools` (via astro-icon) may import `debug`. Alias `debug` → this file in `astro.config.mjs`.
 * @see https://github.com/natemoo-re/astro-icon/issues/277
 */
export default function debug(_namespace: string): (...args: unknown[]) => void {
  return () => {};
}

export function debuglog(): (...args: unknown[]) => void {
  return () => {};
}
