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
    wrangler types --config infra/workers/telemetry-write/wrangler.jsonc --output-path infra/workers/telemetry-write/worker-configuration.d.ts
    wrangler types --config infra/workers/telemetry-read/wrangler.jsonc  --output-path infra/workers/telemetry-read/worker-configuration.d.ts

# Deploy telemetry Workers (staging)
deploy-telemetry:
    wrangler deploy --config infra/workers/telemetry-write/wrangler.jsonc
    wrangler deploy --config infra/workers/telemetry-read/wrangler.jsonc

# Run D1 migrations against local dev database
migrate-local:
    wrangler d1 migrations apply home-sh-telemetry --local --config infra/workers/telemetry-write/wrangler.jsonc

# Run D1 migrations against remote database (production — use carefully)
migrate-remote:
    wrangler d1 migrations apply home-sh-telemetry --config infra/workers/telemetry-write/wrangler.jsonc

# ── OpenTofu / Infrastructure ────────────────────────────────────────────────
# Secrets are read from infra/tofu/secrets.enc.json via the carlpett/sops provider
# at plan/apply time. No shell-level secret injection needed — your age key at
# ~/.config/sops/age/keys.txt is the only requirement.

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

# Edit the encrypted secrets file in-place (sops opens $EDITOR; saves re-encrypt automatically)
tf-secrets:
    sops infra/tofu/secrets.enc.json

# Push runtime secrets from SOPS into the Workers Secrets Store. Idempotent —
# run after editing infra/tofu/secrets.enc.json. Worker reads them via the
# `secrets_store_secrets` bindings declared in apps/site/wrangler.jsonc.
push-secrets:
    bun run scripts/push-secrets.ts


# ── Full pipeline ────────────────────────────────────────────────────────────

# Build everything: WASM + site
build-all: wasm-build build

# Full CI gate: verify site + check WASM
ci: verify wasm-check
