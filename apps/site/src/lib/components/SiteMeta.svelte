<script lang="ts">
  import {
    SITE_DESCRIPTION,
    SITE_OG_IMAGE_PATH,
    SITE_TITLE,
    SITE_URL,
  } from '@config/site';

  let {
    title,
    pathname = '/',
  }: {
    title: string;
    pathname?: string;
  } = $props();

  const canonicalUrl = new URL(pathname, SITE_URL).href;
  const ogImageUrl = new URL(SITE_OG_IMAGE_PATH, SITE_URL).href;
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=2" />
  <link rel="canonical" href={canonicalUrl} />
  <meta name="description" content={SITE_DESCRIPTION} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={SITE_DESCRIPTION} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:site_name" content={SITE_TITLE} />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={SITE_DESCRIPTION} />
  <meta name="twitter:image" content={ogImageUrl} />
  <meta id="theme-color-meta" name="theme-color" content="#151B22" />
  <title>{title}</title>
</svelte:head>
