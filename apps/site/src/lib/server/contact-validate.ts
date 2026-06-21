import { CONTACT_ERROR } from "$lib/contact-error-codes";
import { normalizeContactEmail, singleLine, stripControlChars } from "$lib/server/contact-sanitize";

export type ValidatedContact =
  | { ok: true; name: string; email: string; message: string }
  | { ok: false; code: string };

export function validateContact(body: Record<string, unknown>): ValidatedContact {
  const { name, email, message, token } = body;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    typeof token !== "string" ||
    token.trim().length === 0
  ) {
    return { ok: false, code: CONTACT_ERROR.INVALID_INPUT };
  }

  const cleanName = singleLine(name);
  const cleanMessage = stripControlChars(message, true).trim();
  const cleanEmail = normalizeContactEmail(email);

  if (
    cleanName.length < 1 ||
    cleanName.length > 100 ||
    !cleanEmail ||
    cleanMessage.length < 1 ||
    cleanMessage.length > 2000
  ) {
    return { ok: false, code: CONTACT_ERROR.INVALID_INPUT };
  }

  return {
    ok: true,
    name: cleanName,
    email: cleanEmail,
    message: cleanMessage,
  };
}
