/// <reference types="@cloudflare/workers-types" />

declare global {
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
