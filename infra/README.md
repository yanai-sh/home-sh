# Infrastructure

Operator notes for **yanai.sh**: where config lives, how secrets flow, and which workflows run.

## Principles

| Principle | Here |
|-----------|------|
| No secrets in git | Gitignore plaintext bundles and local JSON. CI reads GitHub encrypted secrets. |
| IaC for Cloudflare primitives | OpenTofu in `tofu/` (D1, KV, Turnstile, custom domain, optional Access). Credentials in gitignored `terraform.tfvars`; `infra-plan` uses the same token and account id from Actions. |
| Immutable Worker releases | Deploy uploads a version then promotes; rollback is its own workflow. Staging uses a separate Worker name. |
| Automation visibility | Workflows write step summaries; token expiry is checked monthly. |

## Layout

```
infra/
  README.md
  ACCESS_WORKERS.md
  secrets/
  tofu/
```

## Secrets

1. **GitHub Actions** — **Environments** (`staging`, `production`) are canonical. Secrets live under each environment (fallback: repo-level secrets). List: `secrets/README.md`.
2. **Cloudflare** — [Secrets Store](https://developers.cloudflare.com/secrets-store/) holds values the Worker reads. Sync with `bun run push-secrets` or the **`yanai-sh / Secrets — push`** workflow.
3. **Local** — `apps/site/.dev.vars` and/or `infra/secrets/worker-secrets.local.json` (from `worker-secrets.example.json`; see `secrets/README.md`).

Do not commit ciphertext or plaintext secret bundles.

## Workflows

| Workflow | Role |
|----------|------|
| `ci.yml` / `ci-dev.yml` (**`yanai-sh / PR — main`**, **`yanai-sh / PR — dev`**) | `bun run verify` on PRs |
| `deploy.yml` (**`yanai-sh / Deploy`**) | Verify, upload, promote on `main`; staging upload on `dev` |
| `infra-plan.yml` (**`yanai-sh / Infra — plan`**) | `tofu plan` when `infra/tofu/**` or related docs change |
| `push-worker-secrets.yml` (**`yanai-sh / Secrets — push`**) | Manual sync from Actions secrets to the Secrets Store |
| `token-expiry-check.yml` (**`yanai-sh / Ops — token expiry`**) | Monthly token check |
| `rollback.yml` (**`yanai-sh / Rollback`**) | Promote an older Worker version |

## Optional next steps

- Remote OpenTofu state: [HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs) or S3 + DynamoDB lock; see `tofu/backend.tf.example`.
- GitHub Environments for `production` / `staging` with protection rules. (Recommended; Deploy already uses them.)
- OIDC from GitHub to a secret manager (Vault, GCP, AWS) if you outgrow long-lived API tokens for *custom* automation. **Wrangler** `versions upload` / `deploy` still expect **`CLOUDFLARE_API_TOKEN`** in practice until Cloudflare documents a JWT/OIDC path for those commands.
