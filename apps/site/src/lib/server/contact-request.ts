import { SITE_URL } from "@config/site";
import { CONTACT_ERROR } from "$lib/contact-error-codes";

const ALLOWED_ORIGIN = new URL(SITE_URL).origin;
const PRODUCTION_HOST = new URL(SITE_URL).hostname;

/** Browser Origin / Referer must match production when present. */
export function contactOriginError(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== ALLOWED_ORIGIN) return CONTACT_ERROR.FORBIDDEN_ORIGIN;
    } catch {
      return CONTACT_ERROR.FORBIDDEN_ORIGIN;
    }
    return null;
  }

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== ALLOWED_ORIGIN) return CONTACT_ERROR.FORBIDDEN_ORIGIN;
    } catch {
      return CONTACT_ERROR.FORBIDDEN_ORIGIN;
    }
  }

  return null;
}

/** Only the production hostname may trigger a real Resend delivery. */
export function isProductionContactHost(requestHost: string): boolean {
  return requestHost === PRODUCTION_HOST;
}

export function contactAllowedOrigin(): string {
  return ALLOWED_ORIGIN;
}
