import { blog } from '#content';
import { SITE_URL } from '@config/site';
import type { RequestHandler } from './$types';

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const GET: RequestHandler = () => {
  const published = blog
    .filter((post) => !('draft' in post && post.draft))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  const items = published
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid>${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.pubDate).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`,
    )
    .join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>yanai.sh — blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Notes from Yanai Klugman</description>${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
