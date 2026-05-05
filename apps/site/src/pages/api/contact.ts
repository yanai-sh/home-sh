// POST /api/contact — contact-form receiver. Validates input, verifies the
// Turnstile token server-side, and forwards the message via Resend.
//
// Bindings come from the site Worker's secrets (`wrangler secret put` →
// site Worker store). Tofu Phase 7 will migrate these to Workers Secrets Store.
//
// Lives in the site Worker (single ingress for yanai.sh), not as a separate
// Worker — avoids the per-route IAM scope and the operational tax of an extra
// deploy artifact.

import { env } from 'cloudflare:workers';
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
    return json({ error: 'Forbidden' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
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
    return json({ error: 'Invalid input' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const verified = await verifyTurnstile(token, env.TURNSTILE_SECRET, ip);
  if (!verified) {
    return json({ error: 'Turnstile verification failed' }, 403);
  }

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Contact from ${name.trim()}`,
      text: `From: ${name.trim()} <${email}>\n\n${message.trim()}`,
    }),
  });

  if (!sendRes.ok) {
    return json({ error: 'Failed to send' }, 502);
  }

  return json({ ok: true });
};
