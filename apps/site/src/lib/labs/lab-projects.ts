import type { RepoMeta } from "$lib/github-repo-meta";

export type SplashStatus = "complete" | "beta" | "alpha" | "concept";

export const SPLASH_STATUSES: SplashStatus[] = ["complete", "beta", "alpha", "concept"];

export type LabDemoLayout = "cards-2col" | "cards-stack";

export type LabSplashProject = {
  slug: string;
  title: string;
  description: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  splashImage?: string;
  splashImageFit?: "cover" | "contain";
  splashStatus?: SplashStatus;
  splashTitle?: string;
  repo?: string;
  tech?: string[];
};

export function splashStatusLabel(status: SplashStatus | undefined): string | null {
  if (!status) return null;
  return status;
}

export function parseSplashStatus(value: string | undefined): SplashStatus | undefined {
  if (!value) return undefined;
  return SPLASH_STATUSES.includes(value as SplashStatus) ? (value as SplashStatus) : undefined;
}

export function projectRepoUrl(repo: string | undefined): string | null {
  if (!repo) return null;
  return `https://github.com/${repo}`;
}

export function repoMetaFor(
  repoMeta: Record<string, RepoMeta | null> | undefined,
  repo: string | undefined,
): RepoMeta | null {
  if (!repo || !repoMeta) return null;
  return repoMeta[repo] ?? null;
}
