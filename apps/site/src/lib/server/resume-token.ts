const TOKEN_ENV_KEYS = ["RESUME_REPO_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"] as const;

export function resolveResumeRepoToken(sources: {
  binding?: string;
  processEnv?: Record<string, string | undefined>;
  metaEnv?: Record<string, string | undefined>;
}): string {
  const binding = sources.binding?.trim();
  if (binding) return binding;

  for (const key of TOKEN_ENV_KEYS) {
    const value = sources.processEnv?.[key]?.trim();
    if (value) return value;
  }

  for (const key of TOKEN_ENV_KEYS) {
    const value = sources.metaEnv?.[key]?.trim();
    if (value) return value;
  }

  return "";
}
