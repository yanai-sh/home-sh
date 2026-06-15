import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { projects } from '#content';
import { portfolio, resumeIndex } from '$lib/data/portfolio';
import { fetchRepoMetaMap, type RepoMeta } from '$lib/github-repo-meta';
import { contactErrorStatus, processContact } from '$lib/server/contact';
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

export const actions: Actions = {
  // Progressive-enhancement contact endpoint: the form posts here with no JS
  // (full page round-trip) and `use:enhance` upgrades it to no-reload AJAX —
  // same server code path either way. Shares processContact() with /api/contact.
  contact: async ({ request, platform }) => {
    if (!platform?.env) return fail(503, { error: 'missing_env' });
    const form = await request.formData();
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const result = await processContact(
      {
        name: form.get('name'),
        email: form.get('email'),
        message: form.get('message'),
        website: form.get('website'),
        token: form.get('cf-turnstile-response'),
      },
      ip,
      platform.env,
    );
    if (!result.ok) return fail(contactErrorStatus(result.code), { error: result.code });
    return { success: true };
  },
};
