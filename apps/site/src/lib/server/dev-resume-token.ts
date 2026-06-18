/** Injected from apps/site/.dev.vars at Vite startup (development only). */
declare const __DEV_RESUME_REPO_TOKEN__: string;

export function devResumeRepoToken(): string {
  if (!import.meta.env.DEV) return "";
  return typeof __DEV_RESUME_REPO_TOKEN__ === "string" ? __DEV_RESUME_REPO_TOKEN__.trim() : "";
}
