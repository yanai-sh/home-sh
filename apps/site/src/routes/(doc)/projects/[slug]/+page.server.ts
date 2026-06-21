import { error } from "@sveltejs/kit";
import { projects } from "#content";
import { portfolio } from "$lib/data/portfolio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  const project = projects.find((entry) => entry.slug === params.slug);
  if (!project) error(404, "Project not found");

  return {
    project,
    title: `${project.title} - ${portfolio.pageTitle}`,
    pathname: `/projects/${project.slug}`,
  };
};
