type OrderedEntry = {
  order: number;
};

type FeaturedProjectEntry = OrderedEntry & {
  featured: boolean;
};

function byOrder<T extends OrderedEntry>(left: T, right: T) {
  return left.order - right.order;
}

export function sortHomepageExperience<T extends OrderedEntry>(entries: readonly T[]) {
  return [...entries].sort(byOrder);
}

export function featuredHomepageProjects<T extends FeaturedProjectEntry>(entries: readonly T[]) {
  return entries.filter((entry) => entry.featured).sort(byOrder);
}
