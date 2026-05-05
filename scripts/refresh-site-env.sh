#!/usr/bin/env bash
# Generate apps/site/.env from env vars (loaded by direnv from SOPS).
# Site only needs the public sitekey at build time.

set -euo pipefail

: "${PUBLIC_TURNSTILE_SITE_KEY:?run \`direnv allow\` or source .envrc first}"

cat > apps/site/.env <<EOF
PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY}
EOF

echo "Refreshed apps/site/.env"
