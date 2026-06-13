import type { PageServerLoad } from './$types';
import { projects } from '#content';
import { portfolio } from '$lib/data/portfolio';
import { fetchRepoMetaMap } from '$lib/github-repo-meta';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ url, platform }) => {
  const featuredProjects = [...projects]
    .filter((project) => project.featured)
    .sort((a, b) => a.order - b.order);

  const repos = featuredProjects
    .map((project) => project.repo)
    .filter((repo): repo is string => Boolean(repo));

  let repoMeta: Awaited<ReturnType<typeof fetchRepoMetaMap>> = {};
  try {
    const waitUntil = platform?.ctx?.waitUntil?.bind(platform.ctx);
    repoMeta = await fetchRepoMetaMap(repos, waitUntil);
  } catch {
    repoMeta = {};
  }

  const hostname = url.hostname;
  const isLocalOrigin = ['127.0.0.1', 'localhost'].includes(hostname);
  const turnstileSiteKey = env.PUBLIC_TURNSTILE_SITE_KEY;
  const canUseContactForm = Boolean(turnstileSiteKey) && !isLocalOrigin;

  return {
    portfolio,
    featuredProjects,
    repoMeta,
    canUseContactForm,
    turnstileSiteKey: turnstileSiteKey ?? '',
  };
};
