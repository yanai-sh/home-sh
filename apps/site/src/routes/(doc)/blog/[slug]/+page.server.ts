import { error } from "@sveltejs/kit";
import { blog } from "#content";
import { portfolio } from "$lib/data/portfolio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  const post = blog.find(
    (entry) => entry.slug === params.slug && !("draft" in entry && entry.draft),
  );
  if (!post) error(404, "Post not found");

  return {
    post,
    title: `${post.title} - ${portfolio.pageTitle}`,
    pathname: `/blog/${post.slug}`,
  };
};
