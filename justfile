# yanai.sh — polyglot task runner
# Install: cargo install just  OR  brew install just

default:
    @just --list

# ── JS / Vite+ site ─────────────────────────────────────────────────────────

dev:
    pnpm run dev

build:
    pnpm run build

verify:
    pnpm run verify

check:
    pnpm run check

fix:
    pnpm run fix

preview:
    pnpm run preview

# ── Cloudflare Workers ───────────────────────────────────────────────────────

# Generate TypeScript types from wrangler bindings (run after changing wrangler.jsonc)
worker-types:
    cd apps/site && pnpm wrangler-types

# Run D1 migrations against local dev database
migrate-local:
    cd apps/site && pnpm exec wrangler d1 migrations apply home-sh-telemetry --local

# Run D1 migrations against remote database (production — use carefully)
migrate-remote:
    cd apps/site && pnpm exec wrangler d1 migrations apply home-sh-telemetry --remote

# ── OpenTofu / Infrastructure ────────────────────────────────────────────────
# OpenTofu reads cloudflare_api_token + cloudflare_account_id from gitignored
# infra/tofu/terraform.tfvars (copy terraform.tfvars.example). CI uses GitHub
# encrypted secrets CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID instead.
# Worker runtime secrets: gitignored infra/secrets/worker-secrets.local.json
# (see infra/secrets/README.md) + optional GitHub workflow push-worker-secrets.yml.

# Initialize OpenTofu — run once after checkout or after adding providers
tf-init:
    cd infra/tofu && tofu init

# Preview infrastructure changes (no-op if already up to date)
tf-plan:
    cd infra/tofu && tofu plan

# Apply infrastructure changes (creates/updates resources)
tf-apply:
    cd infra/tofu && tofu apply

# Destroy all managed infrastructure — destructive, use carefully
tf-destroy:
    cd infra/tofu && tofu destroy

# Edit local worker secrets (gitignored JSON — never commit)
tf-secrets:
    @echo "Edit infra/secrets/worker-secrets.local.json (copy from worker-secrets.example.json)"

# Push runtime secrets into the Workers Secrets Store. Idempotent. Worker reads
# them via `secrets_store_secrets` in apps/site/wrangler.jsonc.
push-secrets:
    pnpm exec tsx scripts/push-secrets.ts

# Optional (not portable / not CI): Bitwarden → local JSON or gh. See scripts/optional/README.md
optional-bitwarden-pull:
    pnpm run optional:bitwarden-to-secrets -- --write
optional-bitwarden-github:
    pnpm run optional:bitwarden-to-secrets -- --gh
optional-bitwarden-sync:
    pnpm run optional:bitwarden-to-secrets -- --write --gh

# ── Resume PDF ───────────────────────────────────────────────────────────────
# Canonical CV is built in yanai-sh/resume (LaTeX → PDF) and attached to each
# `vX.Y.Z` GitHub Release. Download lands in **gitignored** `artifacts/resume/`
# (outside static assets so it never shadows the SSR **`/resume.pdf`** route).

sync-resume-pdf:
    mkdir -p artifacts/resume
    gh release download --repo yanai-sh/resume \
        --pattern 'YanaiKlugman_CV_*.pdf' \
        --output artifacts/resume/YanaiKlugman_CV.pdf \
        --clobber

# ── Full pipeline ────────────────────────────────────────────────────────────

# Full CI gate: verify site
ci: verify
