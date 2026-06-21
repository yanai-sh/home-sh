import { portfolio } from "$lib/data/portfolio";

export const load = () => ({
  title: `Now - ${portfolio.pageTitle}`,
  pathname: "/now",
});
