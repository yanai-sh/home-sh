import { portfolio } from '$lib/data/portfolio';

export const load = () => ({
  title: `Uses — ${portfolio.pageTitle}`,
  pathname: '/uses',
});
