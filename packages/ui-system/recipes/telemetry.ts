import { defineRecipe } from '@pandacss/dev';

/**
 * Telemetry data display — btop-style metadata rows.
 * Uses `warning` token for highlighted metric values.
 */
export const telemetryRecipe = defineRecipe({
  className: 'telemetry',
  description: 'btop-style data display row',
  base: {
    fontFamily: 'mono',
    fontSize: '12px',
    lineHeight: '16px',
    color: 'muted',
    letterSpacing: '0.06em',
    fontWeight: '400',
  },
  variants: {
    emphasis: {
      normal: {},
      highlight: {
        color: 'warning',
      },
      strong: {
        color: 'fg',
        fontWeight: '700',
      },
    },
  },
  defaultVariants: {
    emphasis: 'normal',
  },
});
