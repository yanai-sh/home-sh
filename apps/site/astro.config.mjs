import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://yanai.sh',
  output: 'server',
  integrations: [sitemap()],
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  vite: {
    resolve: {
      alias: {
        '@resume/generated': path.resolve(__dirname, '../../content/resume.generated.json'),
      },
    },
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
