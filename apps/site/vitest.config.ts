import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
  test: {
    include: ['src/**/*.test.ts', '../../scripts/**/*.test.ts'],
    environment: 'node',
    // forks hang on WSL drvfs (/mnt/c); threads is fine on CI too
    pool: 'threads',
  },
});
