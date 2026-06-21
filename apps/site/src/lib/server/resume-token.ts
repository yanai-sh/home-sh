const TOKEN_ENV_KEYS = ["RESUME_REPO_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"] as const;

export function resolveResumeRepoToken(sources: {
  binding?: string;
  privateEnv?: Record<string, string | undefined>;
  processEnv?: Record<string, string | undefined>;
  metaEnv?: Record<string, string | undefined>;
}): string {
  const binding = sources.binding?.trim();
  if (binding) return binding;

  for (const env of [sources.privateEnv, sources.processEnv, sources.metaEnv]) {
    for (const key of TOKEN_ENV_KEYS) {
      const value = env?.[key]?.trim();
      if (value) return value;
    }
  }

  return "";
}
