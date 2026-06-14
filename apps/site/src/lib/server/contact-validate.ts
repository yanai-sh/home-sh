import { CONTACT_ERROR } from '$lib/contact-error-codes';

export type ValidatedContact =
  | { ok: true; name: string; email: string; message: string }
  | { ok: false; code: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(body: Record<string, unknown>): ValidatedContact {
  const { name, email, message, token } = body;
  if (
    typeof name !== 'string' ||
    name.trim().length < 1 ||
    name.length > 100 ||
    typeof email !== 'string' ||
    email.length > 254 ||
    !EMAIL_RE.test(email) ||
    typeof message !== 'string' ||
    message.trim().length < 1 ||
    message.length > 2000 ||
    typeof token !== 'string' ||
    token.length === 0
  ) {
    return { ok: false, code: CONTACT_ERROR.INVALID_INPUT };
  }

  return {
    ok: true,
    name: name.trim(),
    email,
    message: message.trim(),
  };
}
