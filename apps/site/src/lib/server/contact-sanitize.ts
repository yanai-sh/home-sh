/** Strip ASCII control chars (keep TAB/LF for message bodies). */
export function stripControlChars(value: string, allowNewlines = false): string {
  if (allowNewlines) {
    return value.replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }
  return value.replace(/[\0-\x1F\x7F]/g, "");
}

/** Collapse newlines — safe for email subjects and single-line headers. */
export function singleLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContactEmail(email: string): string | null {
  if (/[\0-\x1F\x7F]/.test(email)) return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length < 1 || normalized.length > 254) return null;
  if (!EMAIL_RE.test(normalized)) return null;
  return normalized;
}
