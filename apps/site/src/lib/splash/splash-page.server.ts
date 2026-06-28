import { dev } from "$app/environment";
import { fail } from "@sveltejs/kit";
import type { Actions, ServerLoad } from "@sveltejs/kit";
import { projects } from "#content";
import { splashFlyoutProjects } from "$lib/portfolio-content";
import { portfolio } from "$lib/data/portfolio";
import { fetchRepoMetaMap, type RepoMeta } from "$lib/github-repo-meta";
import { contactFormAvailability } from "$lib/contact-form-availability";
import { contactErrorStatus, processContact } from "$lib/server/contact";
import { contactOriginError } from "$lib/server/contact-request";
import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";

export const splashLoad: ServerLoad = async ({ platform }) => {
  const splashProjects = splashFlyoutProjects(projects);

  const repos = splashProjects
    .map((project) => project.repo)
    .filter((repo): repo is string => Boolean(repo));

  const waitUntil = platform?.ctx?.waitUntil?.bind(platform.ctx);
  const repoMeta = fetchRepoMetaMap(repos, waitUntil).catch(
    (): Record<string, RepoMeta | null> => ({}),
  );

  const { contactFormLive, turnstileSiteKey } = contactFormAvailability(
    PUBLIC_TURNSTILE_SITE_KEY,
    dev,
  );

  return {
    portfolio,
    splashProjects,
    repoMeta,
    contactFormLive,
    turnstileSiteKey,
  };
};

export const splashActions: Actions = {
  // Progressive-enhancement contact endpoint: the form posts here with no JS
  // (full page round-trip) and `use:enhance` upgrades it to no-reload AJAX —
  // same server code path either way. Shares processContact() with /api/contact.
  contact: async ({ request, platform, url }) => {
    if (!platform?.env) return fail(503, { error: "missing_env" });

    const originError = contactOriginError(request);
    if (originError) return fail(403, { error: originError });

    const form = await request.formData();
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const result = await processContact(
      {
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message"),
        website: form.get("website"),
        token: form.get("cf-turnstile-response"),
      },
      ip,
      platform.env,
      { requestHost: url.hostname },
    );
    if (!result.ok) return fail(contactErrorStatus(result.code), { error: result.code });
    return { success: true };
  },
};
