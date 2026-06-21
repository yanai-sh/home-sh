import { SITE_URL } from "@config/site";
import { CONTACT_ERROR } from "$lib/contact-error-codes";
import { secretValue } from "$lib/bindings";
import {
  contactAllowedOrigin,
  contactOriginError,
  isProductionContactHost,
} from "$lib/server/contact-request";
import { singleLine } from "$lib/server/contact-sanitize";
import { validateContact } from "$lib/server/contact-validate";

const PRODUCTION_HOST = new URL(SITE_URL).hostname;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": contactAllowedOrigin(),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

type TurnstileVerifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

const verifyTurnstile = async (
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> => {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      response: token,
      ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
    }),
  });

  if (!response.ok) return false;

  const data = (await response.json()) as TurnstileVerifyResponse;
  if (data.success !== true) return false;
  if (data.hostname !== PRODUCTION_HOST) {
    console.warn("contact: turnstile hostname mismatch", { hostname: data.hostname });
    return false;
  }

  return true;
};

export function handleContactOptions(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export type ContactResult = { ok: true } | { ok: false; code: string };

export type ProcessContactOptions = {
  requestHost: string;
};

/** HTTP status for a contact error code (shared by the JSON endpoint + action). */
export function contactErrorStatus(code: string): number {
  if (code === CONTACT_ERROR.RATE_LIMITED) return 429;
  if (code === CONTACT_ERROR.TURNSTILE_FAILED) return 403;
  if (code === CONTACT_ERROR.NOT_AVAILABLE) return 403;
  if (code === CONTACT_ERROR.SEND_FAILED) return 502;
  return 400;
}

/**
 * Core contact pipeline shared by the JSON endpoint (`/api/contact`) and the
 * SvelteKit form action: honeypot → rate limit → validate → Turnstile → Resend.
 */
export async function processContact(
  body: Record<string, unknown>,
  ip: string,
  env: Env,
  options: ProcessContactOptions,
): Promise<ContactResult> {
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return { ok: true }; // honeypot tripped — accept silently
  }

  if (!isProductionContactHost(options.requestHost)) {
    return { ok: false, code: CONTACT_ERROR.NOT_AVAILABLE };
  }

  const limit = await env.CONTACT_RATE_LIMIT.limit({ key: ip });
  if (!limit.success) {
    return { ok: false, code: CONTACT_ERROR.RATE_LIMITED };
  }

  const validated = validateContact(body);
  if (!validated.ok) {
    return { ok: false, code: validated.code };
  }

  const { name, email, message } = validated;
  const token = typeof body.token === "string" ? body.token.trim() : "";

  const [turnstileSecret, resendKey, contactFrom, contactTo] = await Promise.all([
    secretValue(env.TURNSTILE_SECRET),
    secretValue(env.RESEND_API_KEY),
    secretValue(env.CONTACT_FROM),
    secretValue(env.CONTACT_TO),
  ]);

  if (!turnstileSecret || !resendKey || !contactFrom || !contactTo) {
    console.error("contact: missing required secrets");
    return { ok: false, code: CONTACT_ERROR.SEND_FAILED };
  }

  const verified = await verifyTurnstile(token, turnstileSecret, ip);
  if (!verified) {
    return { ok: false, code: CONTACT_ERROR.TURNSTILE_FAILED };
  }

  const safeName = singleLine(name);
  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: contactFrom,
      to: [contactTo],
      reply_to: email,
      subject: `Contact from ${safeName}`,
      text: `From: ${safeName} <${email}>\n\n${message}`,
    }),
  });

  if (!sendResponse.ok) {
    const responseBody = await sendResponse.text().catch(() => "<unreadable>");
    console.error("contact: resend rejected", {
      status: sendResponse.status,
      body: responseBody,
    });
    return { ok: false, code: CONTACT_ERROR.SEND_FAILED };
  }

  return { ok: true };
}

export async function handleContactPost(request: Request, env: Env): Promise<Response> {
  const originError = contactOriginError(request);
  if (originError) {
    return json({ error: originError }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: CONTACT_ERROR.INVALID_JSON }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const requestHost = new URL(request.url).hostname;
  const result = await processContact(body, ip, env, { requestHost });
  return result.ok
    ? json({ ok: true })
    : json({ error: result.code }, contactErrorStatus(result.code));
}
