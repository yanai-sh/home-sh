export const SITE_TITLE = 'yanai.sh';

/** Production origin: canonical URLs, Open Graph, and `robots.txt` sitemap line. */
export const SITE_URL = 'https://yanai.sh' as const;

/** Path to the default Open Graph / Twitter image (under `public/`). */
export const SITE_OG_IMAGE_PATH = '/brand/og-cover.svg' as const;

/**
 * Optional one line under the hero. Leave empty to omit the lede entirely.
 * Homepage narrative comes from the resume snapshot in `PortfolioHero`.
 */
export const SITE_LEDE = '';

/** Meta description for search / sharing (~160 chars max). */
export const SITE_DESCRIPTION =
  'Yanai Klugman, software engineer. Systems, integration, infrastructure, and automation.';

export const SITE_EMAIL = 'me@yanai.sh';

/** Public source repository — linked from the splash figure caption. */
export const SITE_SOURCE_URL = 'https://github.com/yanai-sh/home-sh';

export const SITE_BRAND = {
  prefix: 'yanai',
  suffix: '.sh',
} as const;

/** Homepage career (#resume) section — short deck under the chapter heading. */
export const HOME_RESUME_SECTION_DECK =
  'Roles and milestones from the CV — the full narrative and PDF are linked from the top of the page.';
