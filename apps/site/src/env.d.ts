/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference path="./worker-configuration.d.ts" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key (public — safe to expose in client). */
  readonly PUBLIC_TURNSTILE_SITE_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Augment the auto-generated `Cloudflare.Env` (from worker-configuration.d.ts,
 * regenerated via `bunx wrangler types apps/site/src/worker-configuration.d.ts`)
 * with secrets that are bound at runtime via `wrangler secret put` rather than
 * declared in wrangler.jsonc. Accessed in API routes via:
 *
 *   import { env } from 'cloudflare:workers';
 */
declare namespace Cloudflare {
  interface Env {
    /** Turnstile widget secret key — server-side token verification. */
    TURNSTILE_SECRET: string;
    /** Resend API key — outbound transactional email. */
    RESEND_API_KEY: string;
    /** From-address for outgoing contact-form notifications. */
    CONTACT_FROM: string;
    /** To-address for outgoing contact-form notifications. */
    CONTACT_TO: string;
  }
}

declare global {
  interface Request {
    /** Present on Cloudflare; absent in some dev environments. */
    cf?: import('@cloudflare/workers-types').CfProperties;
  }
}
