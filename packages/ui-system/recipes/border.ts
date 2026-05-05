import { defineRecipe } from '@pandacss/dev';

/**
 * 1px border with four variants:
 *  quiet   — static low-contrast border
 *  glow    — cursor-reactive radial gradient (requires --mouse-x / --mouse-y)
 *  active  — slightly brighter, marks the current pane
 *  warning — amber tint for validation / error state
 */
export const borderRecipe = defineRecipe({
  className: 'border',
  description: '1px border variants for pane edges',
  base: {
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  variants: {
    variant: {
      quiet: {
        borderColor: 'border.quiet',
      },
      glow: {
        borderColor: 'border.glow',
        // Radial gradient glow is applied via a background-image overlay; the
        // actual reactive highlight is driven by --mouse-x / --mouse-y in the
        // parent component's CSS.
        backgroundImage:
          'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), {colors.border.glow} 0%, transparent 60%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '200% 200%',
      },
      active: {
        borderColor: 'rgba(255,255,255,0.24)',
      },
      warning: {
        borderColor: 'warning',
      },
    },
  },
  defaultVariants: {
    variant: 'quiet',
  },
});
