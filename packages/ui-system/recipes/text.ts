import { defineRecipe } from '@pandacss/dev';

/**
 * Mono type scale — IBM Plex Mono, base 14/20.
 * All line-heights land on 4px multiples.
 */
export const monoRecipe = defineRecipe({
  className: 'mono',
  description: 'IBM Plex Mono type scale',
  base: {
    fontFamily: 'mono',
    fontFeatureSettings: '"calt" 1, "liga" 1',
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
  },
  variants: {
    size: {
      xs: { fontSize: '12px', lineHeight: '16px' },
      sm: { fontSize: '14px', lineHeight: '20px' },
      md: { fontSize: '16px', lineHeight: '24px' },
      lg: { fontSize: '20px', lineHeight: '28px' },
      xl: { fontSize: '28px', lineHeight: '36px' },
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

/**
 * Serif type scale — IBM Plex Serif.
 * All line-heights land on 4px multiples.
 */
export const serifRecipe = defineRecipe({
  className: 'serif',
  description: 'IBM Plex Serif type scale',
  base: {
    fontFamily: 'serif',
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
  },
  variants: {
    size: {
      h3: { fontSize: '28px', lineHeight: '32px' },
      h2: { fontSize: '40px', lineHeight: '48px' },
      h1: { fontSize: '56px', lineHeight: '64px' },
    },
  },
  defaultVariants: {
    size: 'h3',
  },
});
