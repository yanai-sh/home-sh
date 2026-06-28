#!/usr/bin/env sh
# Regenerate worker types only when wrangler config changes (saves ~15–30s per check).
set -eu

types=./src/worker-configuration.d.ts
patch=./scripts/patch-worker-configuration-env.ts

if [ -f "$types" ] && [ "$types" -nt wrangler.jsonc ] && [ "$types" -nt wrangler.dev.jsonc ]; then
  printf 'wrangler-types: up to date\n'
  exit 0
fi

rm -f "$types"
wrangler types "$types"
nub exec tsx "$patch"
