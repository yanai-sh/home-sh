/// <reference types="@cloudflare/workers-types" />

declare global {
  const __DEV_BUILD_ID__: string;

  namespace App {
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
      context: ExecutionContext;
      caches: CacheStorage;
    }
  }
}

export {};
