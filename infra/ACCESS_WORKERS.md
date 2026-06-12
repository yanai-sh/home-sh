# Automating Cloudflare Access for `workers.dev` + preview URLs

OpenTofu in **`infra/tofu/`** manages:

- One **Access policy** (allow users whose email ends with domains you list).
- Four **Access applications** (self-hosted):
  - `yanai-sh-staging.<subdomain>.workers.dev`
  - `*yanai-sh-staging.<subdomain>.workers.dev` (versioned preview hostnames)
  - `yanai-sh.<subdomain>.workers.dev`
  - `*yanai-sh.<subdomain>.workers.dev`

`<subdomain>` is your account’s **workers.dev** slug (Workers & Pages → change subdomain / configuration — **not** the Worker script name).

## Enable in OpenTofu

1. Add to **`infra/tofu/terraform.tfvars`** (gitignored; copy from **`terraform.tfvars.example`**):

   ```hcl
   workers_account_subdomain = "your-account-slug"
   access_allow_email_domains = ["yanai.sh"]
   ```

2. Ensure the API token in **`terraform.tfvars`** (same as **`CLOUDFLARE_API_TOKEN`** in GitHub Actions) includes **Access: Applications and Policies → Edit** for the account. Use one scoped token everywhere you can; rotate both places together.

3. Plan / apply:

   ```bash
   cd infra/tofu && tofu plan && tofu apply
   ```

4. **Discover UUIDs for `tofu import`** (token needs **Access: Applications and Policies → Read**):

   ```bash
   pnpm run cf:list-access-apps
   # optional filter (substring match on domain or name):
   pnpm run cf:list-access-apps workers.dev
   ```

5. **If apply fails** because the dashboard already created apps with the same hostnames, either:
   - **Import** each application and the shared policy into state (IDs from Zero Trust → Access → Applications / Policies), or
   - Remove the duplicate application in the dashboard once, then re-apply so Tofu owns it.

   Import shape (replace IDs from the dashboard / API):

   ```bash
   tofu import 'cloudflare_zero_trust_access_policy.home_sh_workers_access[0]' <policy_uuid>
   tofu import 'cloudflare_zero_trust_access_application.yanai_sh_staging_workers_dev[0]' <app_uuid>
   tofu import 'cloudflare_zero_trust_access_application.yanai_sh_staging_previews[0]' <app_uuid>
   tofu import 'cloudflare_zero_trust_access_application.yanai_sh_workers_dev[0]' <app_uuid>
   tofu import 'cloudflare_zero_trust_access_application.yanai_sh_previews[0]' <app_uuid>
   ```

   Policies use the same API namespace: `GET https://api.cloudflare.com/client/v4/accounts/<account_id>/access/policies` (or Zero Trust dashboard → **Access** → **Policies**).

## Account-wide “Preview URLs” policy

Cloudflare may also show a single **“Cloudflare Workers Preview URLs”** application created the first time anyone enables Access on previews. That is **account-wide** and separate from the per-script `*yanai-sh…` apps above. If you rely only on that global app, you can set `access_allow_email_domains = []` in **`terraform.tfvars`** to skip this file’s resources entirely, or keep both if your org wants an extra explicit match for these Workers only.

## CI — drift plan

Workflow **`.github/workflows/infra-plan.yml`** runs **`tofu init` + `tofu plan`** when **`infra/tofu/**`** or **`infra/ACCESS_WORKERS.md`\*\* changes.

Preferred: add the creds as GitHub **Environment** secrets (this repo uses environments as canonical). Fallback: repo-level Actions secrets.

| Secret                      | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| **`CLOUDFLARE_API_TOKEN`**  | Same scoped token you use for deploys / API scripts |
| **`CLOUDFLARE_ACCOUNT_ID`** | Account id (dashboard URL or Workers overview)      |

If either is missing, the job **skips** plan with a warning (forks without secrets do not fail).

**`terraform.tfvars`** is not read in CI; optional Access vars use **defaults** (`workers_account_subdomain` empty, `access_allow_email_domains` empty), so **`tofu plan` in CI does not expand Access resources** unless you later add a managed tfvars or variable injection step. Local **`tofu plan`** with a real **`terraform.tfvars`** remains the source of truth for full stacks.

### Without a long-lived token in GitHub

You can move OpenTofu runs to **Terraform Cloud** variable sets, **Spacelift** / **Env0**, or **OIDC** into a cloud secret manager and inject `TF_VAR_cloudflare_api_token` per job. This repo uses encrypted Actions secrets for plan and deploy.
