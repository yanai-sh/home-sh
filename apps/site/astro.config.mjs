import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yanai.sh',
  output: 'server',
  integrations: [sitemap()],
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  vite: {
    build: {
      // Keep component scripts as external `<script type="module" src>` so CSP `script-src 'self'` applies.
      assetsInlineLimit: 0,
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    },
  },
});
