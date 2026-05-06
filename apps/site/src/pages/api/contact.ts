// POST /api/contact — contact-form receiver. Validates input, verifies the
// Turnstile token server-side, and forwards the message via Resend.
//
// Secrets bind from the account-level Workers Secrets Store via
// `secrets_store_secrets` in wrangler.jsonc. Each binding is a
// `SecretsStoreSecret` whose value is fetched lazily through `.get()`.
// Source-of-truth for values is infra/tofu/secrets.enc.json (SOPS),
// pushed by `bun run scripts/push-secrets.ts`.
//
// Lives in the site Worker (single ingress for yanai.sh), not as a separate
// Worker — avoids the per-route IAM scope and the operational tax of an extra
// deploy artifact.

import { env } from 'cloudflare:workers';
import { CONTACT_ERROR } from '@lib/contact-error-codes';
import type { APIRoute } from 'astro';

export const prerender = false;

const ALLOWED_ORIGIN = 'https://yanai.sh';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

const verifyTurnstile = async (
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> => {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: CORS });

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin');
  if (origin && origin !== ALLOWED_ORIGIN) {
    return json({ error: CONTACT_ERROR.FORBIDDEN_ORIGIN }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: CONTACT_ERROR.INVALID_JSON }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    // Honeypot tripped — bot filled the trap field. Return ok:true to confuse
    // crawlers; the message is dropped silently.
    console.log('contact: honeypot tripped', { ip: request.headers.get('CF-Connecting-IP') });
    return json({ ok: true });
  }

  // Per-IP rate limit (5/min) sits ahead of Turnstile so abusive callers
  // don't burn siteverify quota. CF-Connecting-IP is set at the edge; in
  // `wrangler dev` it can be missing, so fall back to a literal key.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limit = await env.CONTACT_RATE_LIMIT.limit({ key: ip });
  if (!limit.success) {
    return json({ error: CONTACT_ERROR.RATE_LIMITED }, 429);
  }

  const { name, email, message, token } = body;

  if (
    typeof name !== 'string' ||
    name.trim().length < 1 ||
    name.length > 100 ||
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof message !== 'string' ||
    message.trim().length < 1 ||
    message.length > 2000 ||
    typeof token !== 'string' ||
    token.length === 0
  ) {
    return json({ error: CONTACT_ERROR.INVALID_INPUT }, 400);
  }

  const [turnstileSecret, resendKey, contactFrom, contactTo] = await Promise.all([
    env.TURNSTILE_SECRET.get(),
    env.RESEND_API_KEY.get(),
    env.CONTACT_FROM.get(),
    env.CONTACT_TO.get(),
  ]);

  const verified = await verifyTurnstile(token, turnstileSecret, ip);
  if (!verified) {
    return json({ error: CONTACT_ERROR.TURNSTILE_FAILED }, 403);
  }

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: contactFrom,
      to: [contactTo],
      reply_to: email,
      subject: `Contact from ${name.trim()}`,
      text: `From: ${name.trim()} <${email}>\n\n${message.trim()}`,
    }),
  });

  if (!sendRes.ok) {
    const errBody = await sendRes.text().catch(() => '<unreadable>');
    console.error('contact: resend rejected', { status: sendRes.status, body: errBody });
    return json({ error: CONTACT_ERROR.SEND_FAILED }, 502);
  }

  return json({ ok: true });
};
