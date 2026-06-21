import { env as privateEnv } from "$env/dynamic/private";
import { devResumeRepoToken } from "$lib/server/dev-resume-token";

/** Minimal Env for routes that only need the résumé token in local `vite dev`. */
export function devResumeEnv(): Env {
  const token = devResumeRepoToken() || privateEnv.RESUME_REPO_TOKEN?.trim() || "";
  return { RESUME_REPO_TOKEN: token } as unknown as Env;
}

export function resolveWorkerEnv(platform: App.Platform | undefined): Env {
  const devToken = devResumeRepoToken();
  if (devToken) return { RESUME_REPO_TOKEN: devToken } as unknown as Env;
  return platform?.env ?? devResumeEnv();
}
