#!/usr/bin/env sh
# ponytail: step banners so pre-push verify is not silent for ~6–10 min on WSL /mnt/c.
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

step() {
  printf '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
  printf '▶ %s\n' "$1"
  printf '  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
}

printf 'Verify pipeline — typically 6–10 min on WSL (/mnt/c); step banners show progress.\n'

step '1/6 velite'
pnpm --filter @yanai-sh/site velite

step '2/6 ensure-env + wrangler-types'
pnpm --filter @yanai-sh/site ensure-env
pnpm --filter @yanai-sh/site wrangler-types

step '3/6 check (vp check + svelte-check)'
pnpm --filter @yanai-sh/site check

step '4/6 unit tests (vitest)'
pnpm --filter @yanai-sh/site test

step '5/6 production build (vite)'
PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED pnpm --filter @yanai-sh/site exec vite build

step '6/6 turnstile embed assert'
PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED pnpm --filter @yanai-sh/site exec tsx ./scripts/assert-turnstile-embed.ts

printf '\n✓ verify complete\n'
