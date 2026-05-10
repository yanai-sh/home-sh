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

declare namespace App {
  interface Locals {
    resumeSnapshot?: import('./content/resume-schema').ResumeSnapshot;
  }
}

declare global {
  interface Request {
    /** Present on Cloudflare; absent in some dev environments. */
    cf?: CfProperties;
  }
}
