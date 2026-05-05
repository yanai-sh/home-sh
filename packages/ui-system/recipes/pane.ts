import { defineRecipe } from '@pandacss/dev';

/**
 * Pane container — surface card used across layout zones.
 * Variants map to the three Zone states described in §7.3.
 */
export const paneRecipe = defineRecipe({
  className: 'pane',
  description: 'Pane container with border and background variants',
  base: {
    position: 'relative',
    boxSizing: 'border-box',
    borderRadius: '2px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'border.quiet',
    background: '{colors.bg}',
    overflow: 'hidden',
  },
  variants: {
    variant: {
      default: {},
      active: {
        borderColor: 'rgba(255,255,255,0.24)',
      },
      warning: {
        borderColor: 'warning',
      },
    },
    padding: {
      none: {},
      sm: { padding: '8' },
      md: { padding: '16' },
      lg: { padding: '24' },
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});
