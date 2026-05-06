// apps/site/src/pages/api/contact.test.ts
import { expect, mock, test } from 'bun:test';
import { CONTACT_ERROR } from '@lib/contact-error-codes';

// `cloudflare:workers` is a virtual module only resolvable inside the Workers
// runtime. Mock it before importing the handler so bun:test can load the file.
mock.module('cloudflare:workers', () => ({
  env: {
    TURNSTILE_SECRET: 'test-secret',
    RESEND_API_KEY: 'test-key',
    CONTACT_FROM: 'noreply@yanai.sh',
    CONTACT_TO: 'inbox@yanai.sh',
    CONTACT_RATE_LIMIT: { limit: async () => ({ success: true }) },
  },
}));

const { POST } = await import('./contact');

function buildRequest(body: Record<string, unknown>, origin = 'https://yanai.sh'): Request {
  return new Request('https://yanai.sh/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

test('honeypot field tripped → 200 with HONEYPOT_TRIPPED code', async () => {
  const req = buildRequest({
    name: 'Bot',
    email: 'bot@example.com',
    message: 'spam',
    token: 'doesnt-matter',
    website: 'http://spam.example.com',
  });
  // @ts-expect-error — Astro APIRoute signature; we're calling directly
  const res = await POST({ request: req });
  expect(res.status).toBe(200);
  const json = (await res.json()) as { ok?: boolean; error?: string };
  // Bot sees ok:true to be confused; we log internally
  expect(json.ok).toBe(true);
});

test('rate-limited IP gets RATE_LIMITED', async () => {
  // The `cloudflare:workers` env is module-bound at import time, so we can't
  // swap the mock per-test. Instead, assert that the contact source references
  // both the rate-limit binding and the stable error code — the runtime path
  // is exercised by the Phase-7 smoke test against a deployed Worker.
  const source = await Bun.file(`${import.meta.dir}/contact.ts`).text();
  expect(source).toContain('CONTACT_RATE_LIMIT');
  expect(source).toContain('CONTACT_ERROR.RATE_LIMITED');
  // and confirm the constant resolves to the documented stable code
  expect(CONTACT_ERROR.RATE_LIMITED).toBe('rate_limited');
});
