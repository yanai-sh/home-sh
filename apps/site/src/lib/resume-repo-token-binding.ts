/** Bearer from `RESUME_REPO_TOKEN` binding (.dev.vars string or Secrets Store `.get()`). */

export async function resumeBearerFromBinding(binding: unknown): Promise<string | null> {
  try {
    if (binding === undefined || binding === null) {
      return null;
    }
    if (typeof binding === 'string') {
      const t = binding.trim();
      return t.length > 0 ? t : null;
    }
    if (
      typeof binding === 'object' &&
      binding !== null &&
      'get' in binding &&
      typeof (binding as { get?: unknown }).get === 'function'
    ) {
      const raw = await (binding as { get: () => Promise<unknown> }).get();
      const t = typeof raw === 'string' ? raw.trim() : '';
      return t.length > 0 ? t : null;
    }
    return null;
  } catch {
    return null;
  }
}
