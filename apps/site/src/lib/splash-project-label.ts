/** Label shown in the splash link column (defaults to project title). */
export function splashProjectLabel(project: {
  slug: string;
  title: string;
  splashTitle?: string;
}): string {
  if (project.splashTitle) return project.splashTitle;
  return project.title;
}
