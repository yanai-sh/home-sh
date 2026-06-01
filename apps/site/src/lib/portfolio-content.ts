type OrderedEntry = {
  data: {
    order: number;
  };
};

type FeaturedProjectEntry = OrderedEntry & {
  data: {
    featured: boolean;
  };
};

function byOrder<T extends OrderedEntry>(left: T, right: T) {
  return left.data.order - right.data.order;
}

export function sortHomepageExperience<T extends OrderedEntry>(entries: readonly T[]) {
  return [...entries].sort(byOrder);
}

export function featuredHomepageProjects<T extends FeaturedProjectEntry>(entries: readonly T[]) {
  return entries.filter((entry) => entry.data.featured).sort(byOrder);
}
