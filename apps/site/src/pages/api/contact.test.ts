// apps/site/src/pages/api/contact.test.ts
import { expect, mock, test } from 'bun:test';

// `cloudflare:workers` is a virtual module only resolvable inside the Workers
// runtime. Mock it before importing the handler so bun:test can load the file.
mock.module('cloudflare:workers', () => ({
  env: {
    TURNSTILE_SECRET: 'test-secret',
    RESEND_API_KEY: 'test-key',
    CONTACT_FROM: 'noreply@yanai.sh',
    CONTACT_TO: 'inbox@yanai.sh',
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
