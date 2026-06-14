/** Label shown on the splash “Also” row (defaults to project title). */
export function splashProjectLabel(project: {
  slug: string;
  title: string;
  splashTitle?: string;
}): string {
  if (project.splashTitle) return project.splashTitle;
  if (project.slug === 'home-sh') return 'Source code';
  return project.title;
}

/** home-sh is the repo for this site — link out on splash instead of opening the case-study pane. */
export function splashProjectOpensExternally(slug: string): boolean {
  return slug === 'home-sh';
}
