import type { PageServerLoad } from './$types';
import { projects } from '#content';
import { portfolio, resumeIndex } from '$lib/data/portfolio';
import { fetchRepoMetaMap, type RepoMeta } from '$lib/github-repo-meta';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ url, platform }) => {
  const featuredProjects = [...projects]
    .filter((project) => project.featured)
    .sort((a, b) => a.order - b.order);

  const repos = featuredProjects
    .map((project) => project.repo)
    .filter((repo): repo is string => Boolean(repo));

  const waitUntil = platform?.ctx?.waitUntil?.bind(platform.ctx);
  // Streamed (deferred): don't await — SvelteKit serialises this promise and
  // streams the repo stats in after the shell HTML, so first paint isn't
  // blocked on the GitHub round-trip.
  const repoMeta = fetchRepoMetaMap(repos, waitUntil).catch(
    (): Record<string, RepoMeta | null> => ({}),
  );

  const hostname = url.hostname;
  const isLocalOrigin = ['127.0.0.1', 'localhost'].includes(hostname);
  const turnstileSiteKey = env.PUBLIC_TURNSTILE_SITE_KEY;
  const canUseContactForm = Boolean(turnstileSiteKey) && !isLocalOrigin;

  return {
    portfolio,
    featuredProjects,
    repoMeta,
    resumeIndex,
    canUseContactForm,
    turnstileSiteKey: turnstileSiteKey ?? '',
  };
};
