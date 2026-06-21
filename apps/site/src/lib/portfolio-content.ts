type SplashFlyoutEntry = {
  order: number;
  featured: boolean;
  slug: string;
};

function byOrder<T extends { order: number }>(left: T, right: T) {
  return left.order - right.order;
}

/** Featured splash cards plus the site repo (`home-sh`), ordered for the flyout grid. */
export function splashFlyoutProjects<T extends SplashFlyoutEntry>(entries: readonly T[]): T[] {
  const homeSh = entries.find((entry) => entry.slug === "home-sh");
  const featured = entries
    .filter((entry) => entry.featured && entry.slug !== "home-sh")
    .sort(byOrder);
  if (!homeSh) return featured;
  return [...featured, homeSh].sort(byOrder);
}
