#!/usr/bin/env bash
# Generate infra/workers/contact/.dev.vars from env vars (loaded by direnv from SOPS).
# Wrangler dev reads .dev.vars (NOT process env), so we materialize a file.

set -euo pipefail

: "${TURNSTILE_SECRET:?run \`direnv allow\` or source .envrc first}"
: "${RESEND_API_KEY:?run \`direnv allow\` or source .envrc first}"
: "${CONTACT_FROM:?run \`direnv allow\` or source .envrc first}"
: "${CONTACT_TO:?run \`direnv allow\` or source .envrc first}"

cat > infra/workers/contact/.dev.vars <<EOF
TURNSTILE_SECRET=${TURNSTILE_SECRET}
RESEND_API_KEY=${RESEND_API_KEY}
CONTACT_FROM=${CONTACT_FROM}
CONTACT_TO=${CONTACT_TO}
EOF

echo "Refreshed infra/workers/contact/.dev.vars"
