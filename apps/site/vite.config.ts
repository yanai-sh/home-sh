import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [cloudflare({ configPath: './wrangler.jsonc' }), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@views': path.resolve(__dirname, './src/views'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@config': path.resolve(__dirname, './src/config'),
      '#content': path.resolve(__dirname, './.velite/index.js'),
      '@resume/generated': path.resolve(__dirname, '../../content/resume.generated.json'),
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          // Browser entry, compiled + bundled into the client build. A `?url`
          // import would only copy the raw .ts file (unresolved aliases, and
          // Workers Static Assets serves `.ts` as video/mp2t).
          input: {
            'splash-client': path.resolve(__dirname, 'src/scripts/splash-client.ts'),
          },
          output: {
            // Stable name so SSR can reference it without a manifest lookup;
            // assets ship with `max-age=0, must-revalidate` so updates are safe.
            entryFileNames: 'assets/[name].js',
          },
        },
      },
    },
  },
  server: {
    host: '::',
    port: 4321,
  },
  preview: {
    host: '::',
    port: 4321,
  },
  lint: {
    ignorePatterns: ['dist/**', '.velite/**', '.astro/**', 'public/wasm/**'],
  },
  fmt: {
    semi: true,
    singleQuote: true,
    printWidth: 100,
  },
  run: {
    tasks: {
      'sync:resume': {
        command: 'pnpm --dir ../.. sync:resume',
        cache: true,
      },
    },
  },
});
