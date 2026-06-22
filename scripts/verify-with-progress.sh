#!/usr/bin/env sh
# ponytail: step banners + heartbeats so pre-push verify is not silent for ~6–10 min on WSL /mnt/c.
set -eu

export PATH="${HOME}/.nub/bin:${PATH:-}"
export NODE_COMPAT=1

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

run_step '1/6 velite' nub -F @yanai-sh/site run velite

step '2/6 ensure-env + wrangler-types'
nub -F @yanai-sh/site run ensure-env
nub -F @yanai-sh/site run wrangler-types

run_step '3/6 check (vp check + svelte-check)' nub -F @yanai-sh/site run check
run_step '4/6 unit tests (vitest)' nub -F @yanai-sh/site run test
run_step '5/6 production build (vite)' env PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED sh -c 'cd apps/site && nub exec vite build'

step '6/6 turnstile embed assert'
PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED sh -c 'cd apps/site && nub exec tsx ./scripts/assert-turnstile-embed.ts'

say ""
say "✓ verify complete"
