import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://yanai.sh',
  output: 'server',
  integrations: [sitemap(), icon(), mdx()],
  adapter: cloudflare({
    platformProxy: { enabled: false },
    imageService: 'passthrough',
    // Helps some iconify/astro-icon edge cases under workerd; keeps prerender on Node when needed.
    prerenderEnvironment: 'node',
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@resume/generated': path.resolve(__dirname, '../../content/resume.generated.json'),
        debug: path.resolve(__dirname, './src/debug-workerd-stub.ts'),
      },
    },
    build: {
      assetsInlineLimit: 0,
    },
    ssr: {
      optimizeDeps: {
        exclude: [
          'astro-icon',
          'astro-icon/components',
          '@iconify/tools',
          '@iconify/types',
          '@iconify/utils',
          'astro/assets/services/noop',
          'astro/zod',
          'picomatch',
        ],
      },
      noExternal: ['astro-icon', '@iconify/tools', '@iconify/types', '@iconify/utils'],
    },
  },
});
