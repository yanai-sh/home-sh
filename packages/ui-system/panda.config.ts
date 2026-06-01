import { definePreset } from '@pandacss/dev';
import { borderRecipe } from './recipes/border';
import { heroCtaRecipe } from './recipes/hero-cta';
import { paneRecipe } from './recipes/pane';
import { monoRecipe, serifRecipe } from './recipes/text';
import { telemetryRecipe } from './recipes/telemetry';

const uiPreset = definePreset({
  theme: {
    tokens: {
      colors: {
        /** Warm paper-like canvas (Astro career-portfolio–style light theme). */
        bg: { value: '#f6f5f3' },
        fg: { value: '#171717' },
        muted: { value: '#737373' },
        accent: { value: '#2563eb' },
        /** Text on filled accent controls (primary CTA, etc.). */
        onAccent: { value: '#ffffff' },
        warning: { value: '#b45309' },
        border: {
          quiet: { value: 'rgba(23,23,23,0.08)' },
          glow: { value: 'rgba(37,99,235,0.12)' },
        },
        surface: {
          base: { value: '#ffffff' },
          contact: { value: '#ffffff' },
          contactLift: { value: 'rgba(248,250,252,0.96)' },
          contactField: { value: '#f8fafc' },
        },
        hero: {
          ctaPrimaryBorder: { value: '#1d4ed8' },
          ctaPrimaryBg: { value: '#2563eb' },
          ctaPrimaryBgHover: { value: '#1d4ed8' },
          ctaOutlineBorder: { value: 'rgba(37,99,235,0.42)' },
          ctaOutlineBgHover: { value: 'rgba(37,99,235,0.08)' },
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
      heroCta: heroCtaRecipe,
      pane: paneRecipe,
      mono: monoRecipe,
      serif: serifRecipe,
      telemetry: telemetryRecipe,
    },
  },
});

export default uiPreset;
