# Worker and tooling secrets

Real values live in gitignored `worker-secrets.local.json` or in GitHub Actions secrets. This directory only ships the example JSON and this file.

## GitHub repository secrets

**Settings → Secrets and variables → Actions**

| Secret | Used by |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploy, infra plan, token probe, push-secrets workflow |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy, infra plan, push-secrets workflow |
| `PUBLIC_TURNSTILE_SITE_KEY` | Deploy / verify (public site key) |
| `TURNSTILE_SECRET` | Push Worker secrets → Secrets Store |
| `RESEND_API_KEY` | Push Worker secrets → Secrets Store |
| `CONTACT_FROM` | Push Worker secrets → Secrets Store |
| `CONTACT_TO` | Push Worker secrets → Secrets Store |
| `RESUME_REPO_TOKEN` | Push Worker secrets → Secrets Store (PAT: private resume repo + Releases) |

After a rotation, run **Actions → Push Worker secrets** or `bun run push-secrets` locally with an updated `worker-secrets.local.json`.

## Local machine

```bash
cp infra/secrets/worker-secrets.example.json infra/secrets/worker-secrets.local.json
# edit values; never commit this file
```

With direnv allowed, `.envrc` exports keys from that JSON as `UPPER_SNAKE_CASE`. For Astro dev, prefer `apps/site/.dev.vars` (see `CONTRIBUTING.md`).

## OpenTofu

Worker bindings are separate from `infra/tofu/terraform.tfvars`. When you rotate the Cloudflare API token, update both tfvars and the `CLOUDFLARE_API_TOKEN` secret.
