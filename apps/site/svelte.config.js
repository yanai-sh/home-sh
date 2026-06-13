import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      config: 'wrangler.jsonc',
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),
    alias: {
      '#content': '.velite/index.js',
      '@config': 'src/config',
    },
  },
};

export default config;
