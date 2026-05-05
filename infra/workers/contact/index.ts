interface Env {
  TURNSTILE_SECRET: string;
  RESEND_API_KEY: string;
  CONTACT_FROM: string; // e.g. "contact@yanai.sh"
  CONTACT_TO: string;   // e.g. "you@yourdomain.com"
}

const ALLOWED_ORIGIN = 'https://yanai.sh';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Block requests not from the expected origin in production
    const origin = request.headers.get('Origin');
    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: 'Forbidden' }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { name, email, message, token } = body;

    if (
      typeof name !== 'string'    || name.trim().length < 1     || name.length > 100   ||
      typeof email !== 'string'   || email.length > 254          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof message !== 'string' || message.trim().length < 1   || message.length > 2000 ||
      typeof token !== 'string'   || token.length === 0
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
  },
} satisfies ExportedHandler<Env>;
