import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://yanai.sh',
  output: 'server',
  integrations: [
    sitemap(),
    // Resolves SVGs from `src/icons/*.svg` and inlines them at build time so the
    // worker has no runtime dependency on an Iconify pack (workerd lacks Node fs).
    // SVGs were extracted from @iconify-json/simple-icons via:
    //   scripts/sync-tech-icons.ts
    icon(),
  ],
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
