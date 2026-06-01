export const CONTACT_ERROR = {
  FORBIDDEN_ORIGIN: 'forbidden_origin',
  INVALID_JSON: 'invalid_json',
  HONEYPOT_TRIPPED: 'honeypot_tripped',
  INVALID_INPUT: 'invalid_input',
  TURNSTILE_FAILED: 'turnstile_failed',
  RATE_LIMITED: 'rate_limited',
  SEND_FAILED: 'send_failed',
} as const;

export type ContactErrorCode = (typeof CONTACT_ERROR)[keyof typeof CONTACT_ERROR];

const MESSAGES: Record<ContactErrorCode, string> = {
  forbidden_origin: 'request blocked',
  invalid_json: 'malformed request',
  honeypot_tripped: 'message accepted',
  invalid_input: 'check the name, email, and message fields',
  turnstile_failed: 'complete the captcha and try again',
  rate_limited: 'too many requests, try again in a minute',
  send_failed: 'something went wrong on our side',
};

export function errorMessage(code: string): string {
  if (code in MESSAGES) return MESSAGES[code as ContactErrorCode];
  return 'something went wrong';
}
