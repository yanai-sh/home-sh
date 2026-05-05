import { definePreset } from '@pandacss/dev';
import { borderRecipe } from './recipes/border';
import { paneRecipe } from './recipes/pane';
import { monoRecipe, serifRecipe } from './recipes/text';
import { telemetryRecipe } from './recipes/telemetry';

const uiPreset = definePreset({
  theme: {
    tokens: {
      colors: {
        bg: { value: '#151B22' },
        fg: { value: '#E8E8E8' },
        muted: { value: '#8A8A8A' },
        accent: { value: '#2F6BFF' },
        warning: { value: '#D7B97A' },
        border: {
          quiet: { value: 'rgba(255,255,255,0.08)' },
          glow: { value: 'rgba(255,255,255,0.16)' },
        },
        surface: {
          base: { value: '#202733' },
          contact: { value: 'rgba(28,34,44,0.92)' },
          contactLift: { value: 'rgba(245,247,250,0.11)' },
          contactField: { value: 'rgba(245,247,250,0.075)' },
        },
      },
      spacing: {
        // 4px grid
        '0': { value: '0' },
        '4': { value: '4px' },
        '8': { value: '8px' },
        '12': { value: '12px' },
        '16': { value: '16px' },
        '24': { value: '24px' },
        '32': { value: '32px' },
        '48': { value: '48px' },
        '64': { value: '64px' },
        '96': { value: '96px' },
      },
      fonts: {
        mono: { value: "'IBM Plex Mono', monospace" },
        serif: { value: "'IBM Plex Serif', serif" },
      },
      // Type scale — mono (base 14/20)
      fontSizes: {
        'mono-xs': { value: '12px' },
        'mono-sm': { value: '14px' },
        'mono-md': { value: '16px' },
        'mono-lg': { value: '20px' },
        'mono-xl': { value: '28px' },
        // Serif
        'serif-h3': { value: '28px' },
        'serif-h2': { value: '40px' },
        'serif-h1': { value: '56px' },
      },
      lineHeights: {
        'mono-xs': { value: '16px' },
        'mono-sm': { value: '20px' },
        'mono-md': { value: '24px' },
        'mono-lg': { value: '28px' },
        'mono-xl': { value: '36px' },
        'serif-h3': { value: '32px' },
        'serif-h2': { value: '48px' },
        'serif-h1': { value: '64px' },
      },
    },
    recipes: {
      border: borderRecipe,
      pane: paneRecipe,
      mono: monoRecipe,
      serif: serifRecipe,
      telemetry: telemetryRecipe,
    },
  },
});

export default uiPreset;
