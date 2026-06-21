import { blog } from "#content";
import { portfolio } from "$lib/data/portfolio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  const published = blog
    .filter((post) => !("draft" in post && post.draft))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  return {
    posts: published,
    title: `Blog - ${portfolio.pageTitle}`,
    pathname: "/blog",
  };
};
