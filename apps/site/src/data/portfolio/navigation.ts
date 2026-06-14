import type { PortfolioLink } from './types';

export const navigation = {
  label: 'Main navigation',
  items: [
    { label: 'Home', href: '#home' },
    { label: 'Work', href: '#career' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ] satisfies PortfolioLink[],
} as const;

/** Doc routes on the splash — not duplicated in the project list. */
export const splashSiteLinks = [
  { label: 'Blog', href: '/blog' },
  { label: 'Uses', href: '/uses' },
  { label: 'Now', href: '/now' },
] satisfies PortfolioLink[];
