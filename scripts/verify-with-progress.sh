#!/usr/bin/env sh
# ponytail: step banners + heartbeats so pre-push verify is not silent for ~6–10 min on WSL /mnt/c.
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

# Line-buffered when available (helps under lefthook / non-TTY). Guard --run to avoid re-exec loop.
if [ "${1:-}" = "--run" ]; then
  shift
elif command -v stdbuf >/dev/null 2>&1; then
  exec stdbuf -oL -eL sh "$0" --run "$@"
fi

say() {
  # stderr is typically unbuffered; lefthook streams it when interactive: true
  printf '%s\n' "$1" >&2
}

step() {
  say ""
  say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  say "▶ $1"
  say "  $(date '+%Y-%m-%d %H:%M:%S')"
  say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  say ""
}

heartbeat() {
  pid=$1
  label=$2
  while kill -0 "$pid" 2>/dev/null; do
    sleep 20
    kill -0 "$pid" 2>/dev/null || break
    say "  … $label still running ($(date '+%H:%M:%S'))"
  done
}

run_step() {
  label=$1
  shift
  step "$label"
  "$@" &
  pid=$!
  heartbeat "$pid" "$label" &
  hb=$!
  wait "$pid"
  ec=$?
  kill "$hb" 2>/dev/null || true
  wait "$hb" 2>/dev/null || true
  return "$ec"
}

say "Verify pipeline — typically 6–10 min on WSL (/mnt/c); steps print as they start."

run_step '1/6 velite' pnpm --filter @yanai-sh/site velite

step '2/6 ensure-env + wrangler-types'
pnpm --filter @yanai-sh/site ensure-env
pnpm --filter @yanai-sh/site wrangler-types

run_step '3/6 check (vp check + svelte-check)' pnpm --filter @yanai-sh/site check
run_step '4/6 unit tests (vitest)' pnpm --filter @yanai-sh/site test
run_step '5/6 production build (vite)' env PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED pnpm --filter @yanai-sh/site exec vite build

step '6/6 turnstile embed assert'
PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED pnpm --filter @yanai-sh/site exec tsx ./scripts/assert-turnstile-embed.ts

say ""
say "✓ verify complete"
