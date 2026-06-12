# Worker and tooling secrets

Portable contract: values live in **GitHub Actions encrypted secrets** (CI/deploy) and/or **gitignored** `worker-secrets.local.json` / `apps/site/.dev.vars` on your machine. Nothing in this repo depends on Bitwarden, 1Password, or any other vault CLI for **build**, **verify**, or **deploy**.

This directory ships **`worker-secrets.example.json`** (shape only) and this README.

## GitHub Actions secrets

Preferred: **GitHub Environments** to scope deploy credentials.

- Create environments: **`staging`** and **`production`**.
- Put deploy/test settings under each environment:
  - **Environment variables** (not secrets): `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`, `CF_ACCESS_CLIENT_ID`
  - **Secrets**: `CLOUDFLARE_API_TOKEN`, `CF_ACCESS_CLIENT_SECRET`
  - **Worker runtime (synced to Secrets Store by Deploy)**: `TURNSTILE_SECRET`, `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `RESUME_REPO_TOKEN`
  - **Access smoke (preview URLs)**: `CF_ACCESS_CLIENT_ID` (var), `CF_ACCESS_CLIENT_SECRET` (secret) (Service Token)

Fallback (not recommended): repo-level Actions secrets (**Settings → Secrets and variables → Actions**) if you don't use environments.

**Dependabot PRs** (version bumps to `main`) only receive **Dependabot** secrets, not Actions or environment secrets ([docs](https://docs.github.com/en/code-security/dependabot/troubleshooting-dependabot/troubleshooting-dependabot-on-github-actions#accessing-secrets)). Add **`RESUME_REPO_TOKEN`** again under **Settings → Secrets and variables → Dependabot** (same PAT as `staging` / `production`) so **`yanai-sh / Verify (reusable)** can clone the private **`resume/`** submodule. Optional: add **`PUBLIC_TURNSTILE_SITE_KEY`** as a Dependabot **repository variable** if verify needs it and it is only defined on an environment today.

| Secret                      | Used by                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`      | Deploy, infra plan, token probe, push-secrets workflow                                                                                                                                                                   |
| `CLOUDFLARE_ACCOUNT_ID`     | Deploy, infra plan, push-secrets workflow (environment variable)                                                                                                                                                         |
| `PUBLIC_TURNSTILE_SITE_KEY` | Deploy / verify (public site key; environment variable)                                                                                                                                                                  |
| `TURNSTILE_SECRET`          | **yanai-sh / Secrets — push** → Secrets Store                                                                                                                                                                            |
| `RESEND_API_KEY`            | **yanai-sh / Secrets — push** → Secrets Store                                                                                                                                                                            |
| `CONTACT_FROM`              | **yanai-sh / Secrets — push** → Secrets Store                                                                                                                                                                            |
| `CONTACT_TO`                | **yanai-sh / Secrets — push** → Secrets Store                                                                                                                                                                            |
| `RESUME_REPO_TOKEN`         | **yanai-sh / Secrets — push** → Secrets Store (PAT: private resume repo + Releases); **GitHub Actions** checkout uses the same secret to **`git clone`** the **`resume/`** submodule in PR / Deploy / Rollback workflows |
| `CF_ACCESS_CLIENT_ID`       | Smoke against Access-protected preview URLs (Service Token; environment variable)                                                                                                                                        |
| `CF_ACCESS_CLIENT_SECRET`   | Smoke against Access-protected preview URLs (Service Token secret)                                                                                                                                                       |

After a rotation, run **Actions → yanai-sh / Secrets — push** or **`pnpm run push-secrets`** locally with an updated `worker-secrets.local.json`. That script reads **`cloudflare_api_token`** and **`cloudflare_account_id`** from the same JSON when those env vars are unset (optional fields in **`worker-secrets.example.json`**).

## Local machine

```bash
cp infra/secrets/worker-secrets.example.json infra/secrets/worker-secrets.local.json
# edit values; never commit this file
```

With direnv allowed, `.envrc` exports keys from that JSON as `UPPER_SNAKE_CASE`. For local dev, prefer `apps/site/.dev.vars` (see `AGENTS.md`).

**`resume_repo_token`:** paste the **same** PAT string as the **`RESUME_REPO_TOKEN`** GitHub Actions secret (the one **`push-secrets`** pushes to the Worker). One token for prod and local avoids “works in deploy / 502 in smoke” drift.

## OpenTofu

Worker bindings are separate from `infra/tofu/terraform.tfvars`. When you rotate the Cloudflare API token, update both tfvars and the `CLOUDFLARE_API_TOKEN` secret.

## Optional: Bitwarden (maintainer convenience only)

If _you_ store the same values in Bitwarden, use **`scripts/optional/bitwarden-to-secrets.ts`** (see **`scripts/optional/README.md`**) to copy into `worker-secrets.local.json` or `gh secret set`. Custom field names should match the GitHub secret names above; **`RESUME_GITHUB_TOKEN`** in Bitwarden maps to **`RESUME_REPO_TOKEN`** on GitHub.
