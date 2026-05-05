import { defineConfig } from '@pandacss/dev';
import uiPreset from '@yanai-sh/ui-system';

export default defineConfig({
  presets: ['@pandacss/dev/presets', uiPreset],
  include: ['./src/**/*.{ts,tsx,astro}'],
  outdir: 'styled-system',
  jsxFramework: undefined,
});
