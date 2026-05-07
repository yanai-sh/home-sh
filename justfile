# yanai.sh — polyglot task runner
# Install: cargo install just  OR  brew install just

default:
    @just --list

# ── JS / Astro ──────────────────────────────────────────────────────────────

dev:
    bun run dev

build:
    bun run build

verify:
    bun run verify

check:
    bun run check

fix:
    bun run fix

preview:
    bun run preview

# ── Rust / WASM ─────────────────────────────────────────────────────────────

# Build all WASM modules (requires wasm-pack)
wasm-build:
    wasm-pack build apps/wasm/bridge --target web --out-dir ../../site/public/wasm/bridge
    wasm-pack build apps/wasm/canvas --target web --out-dir ../../site/public/wasm/canvas
    wasm-pack build apps/wasm/search --target web --out-dir ../../site/public/wasm/search
    rm -f apps/site/public/wasm/*/.gitignore

# Check all Rust crates compile for wasm32
wasm-check:
    cargo check --target wasm32-unknown-unknown --workspace

# Run clippy on all Rust crates
wasm-lint:
    cargo clippy --target wasm32-unknown-unknown --workspace -- -D warnings

# ── Cloudflare Workers ───────────────────────────────────────────────────────

# Generate TypeScript types from wrangler bindings (run after changing wrangler.jsonc)
worker-types:
    cd apps/site && bun run wrangler-types

# Run D1 migrations against local dev database
migrate-local:
    cd apps/site && bunx wrangler d1 migrations apply home-sh-telemetry --local

# Run D1 migrations against remote database (production — use carefully)
migrate-remote:
    cd apps/site && bunx wrangler d1 migrations apply home-sh-telemetry --remote

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
    bun run scripts/push-secrets.ts

# Optional (not portable / not CI): Bitwarden → local JSON or gh. See scripts/optional/README.md
optional-bitwarden-pull:
    bun run optional:bitwarden-to-secrets -- --write
optional-bitwarden-github:
    bun run optional:bitwarden-to-secrets -- --gh
optional-bitwarden-sync:
    bun run optional:bitwarden-to-secrets -- --write --gh

# ── Resume PDF ───────────────────────────────────────────────────────────────
# Canonical CV is built in yanai-sh/resume (LaTeX → PDF) and attached to each
# `vX.Y.Z` GitHub Release. Download lands in **gitignored** `artifacts/resume/`
# (outside Astro `public/` so it never shadows the SSR **`/resume.pdf`** route).

sync-resume-pdf:
    mkdir -p artifacts/resume
    gh release download --repo yanai-sh/resume \
        --pattern 'YanaiKlugman_CV_*.pdf' \
        --output artifacts/resume/YanaiKlugman_CV.pdf \
        --clobber

# ── Full pipeline ────────────────────────────────────────────────────────────

# Build everything: WASM + site
build-all: wasm-build build

# Full CI gate: verify site + check WASM
ci: verify wasm-check
