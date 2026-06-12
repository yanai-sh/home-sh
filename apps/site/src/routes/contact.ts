import { Hono } from 'hono';
import { CONTACT_ERROR } from '@lib/contact-error-codes';
import { secretValue } from '@lib/bindings';

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
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  });
  const data = (await response.json()) as { success: boolean };
  return data.success === true;
};

export const contactRoutes = new Hono<{ Bindings: Env }>();

contactRoutes.options('/api/contact', () => new Response(null, { status: 204, headers: CORS }));

contactRoutes.post('/api/contact', async (c) => {
  const request = c.req.raw;
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
    return json({ ok: true });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limit = await c.env.CONTACT_RATE_LIMIT.limit({ key: ip });
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
    secretValue(c.env.TURNSTILE_SECRET),
    secretValue(c.env.RESEND_API_KEY),
    secretValue(c.env.CONTACT_FROM),
    secretValue(c.env.CONTACT_TO),
  ]);

  const verified = await verifyTurnstile(token, turnstileSecret, ip);
  if (!verified) {
    return json({ error: CONTACT_ERROR.TURNSTILE_FAILED }, 403);
  }

  const sendResponse = await fetch('https://api.resend.com/emails', {
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

  if (!sendResponse.ok) {
    const responseBody = await sendResponse.text().catch(() => '<unreadable>');
    console.error('contact: resend rejected', {
      status: sendResponse.status,
      body: responseBody,
    });
    return json({ error: CONTACT_ERROR.SEND_FAILED }, 502);
  }

  return json({ ok: true });
});
