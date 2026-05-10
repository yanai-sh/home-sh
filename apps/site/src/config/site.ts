export const SITE_TITLE = 'yanai.sh';

/** Production origin: canonical URLs, Open Graph, and `robots.txt` sitemap line. */
export const SITE_URL = 'https://yanai.sh' as const;

/** Path to the default Open Graph / Twitter image (under `public/`). */
export const SITE_OG_IMAGE_PATH = '/brand/og-cover.svg' as const;

/**
 * Optional one line under the hero. Leave empty to omit the lede entirely.
 */
export const SITE_LEDE =
  'Software developer focused on systems, integration, infrastructure, DevOps, and forward-deployed engineering.';

/** Meta description for search / sharing (~160 chars max). */
export const SITE_DESCRIPTION =
  'Software developer focused on systems, integration, infrastructure, DevOps, and forward-deployed engineering.';

export const SITE_EMAIL = 'me@yanai.sh';

export const SITE_BRAND = {
  prefix: 'yanai',
  suffix: '.sh',
} as const;

/** Homepage resume (#resume) section — short deck under the chapter kicker. */
export const HOME_RESUME_SECTION_DECK =
  'Career timeline, selective projects, and the technical stacks I rely on day to day.';
