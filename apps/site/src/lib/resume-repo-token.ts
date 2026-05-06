import { env } from 'cloudflare:workers';

import { resumeBearerFromBinding } from './resume-repo-token-binding';

export { resumeBearerFromBinding } from './resume-repo-token-binding';

/** Bearer for GitHub APIs against `yanai-sh/resume` (contents + releases). */
export async function resumeRepoBearer(): Promise<string | null> {
  return resumeBearerFromBinding(env.RESUME_REPO_TOKEN);
}
