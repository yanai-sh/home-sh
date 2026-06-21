import { blog, projects } from "#content";
import { SITE_URL } from "@config/site";
import type { RequestHandler } from "./$types";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function urlEntry(path: string, lastmod?: string): string {
  const loc = `${SITE_URL}${path}`;
  const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
}

export const GET: RequestHandler = () => {
  const publishedBlog = blog
    .filter((post) => !("draft" in post && post.draft))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  const entries = [
    urlEntry("/"),
    urlEntry("/uses"),
    urlEntry("/now"),
    urlEntry("/blog"),
    ...publishedBlog.map((post) => urlEntry(`/blog/${post.slug}`, post.pubDate)),
    ...projects.map((project) => urlEntry(`/projects/${project.slug}`)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
