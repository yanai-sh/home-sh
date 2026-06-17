import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    files: {
      assets: "public",
    },
    adapter: adapter({
      config: "wrangler.jsonc",
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
    alias: {
      "#content": ".velite/index.js",
      "@config": "src/config",
    },
    // Hash inline hydration scripts so production CSP can stay strict (see security.ts).
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
        "style-src": ["self", "unsafe-inline"],
        "font-src": ["self"],
        "img-src": ["self", "data:"],
        "script-src": ["self", "https://challenges.cloudflare.com"],
        "frame-src": ["self", "https://challenges.cloudflare.com"],
        "frame-ancestors": ["none"],
        "connect-src": ["self", "https://challenges.cloudflare.com"],
      },
    },
  },
};

export default config;
