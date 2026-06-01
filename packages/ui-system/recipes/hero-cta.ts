import { defineRecipe } from '@pandacss/dev';

/**
 * Homepage hero CTAs — token-backed so the first viewport stays on-brand.
 */
export const heroCtaRecipe = defineRecipe({
  className: 'heroCta',
  description: 'Primary and outline call-to-action links in the hero lede',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minHeight: '40px',
    paddingInline: '16px',
    fontFamily: 'mono',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderStyle: 'solid',
    borderWidth: '1px',
    color: 'fg',
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease',
  },
  variants: {
    variant: {
      primary: {
        borderColor: 'hero.ctaPrimaryBorder',
        backgroundColor: 'hero.ctaPrimaryBg',
        color: 'onAccent',
        _hover: {
          backgroundColor: 'hero.ctaPrimaryBgHover',
          borderColor: 'hero.ctaPrimaryBorder',
          color: 'onAccent',
        },
      },
      outline: {
        borderColor: 'hero.ctaOutlineBorder',
        _hover: {
          backgroundColor: 'hero.ctaOutlineBgHover',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});
