#!/usr/bin/env sh
# ponytail: one sync, parallel lint+tests, optional build. Modes: quick | verify
# Set AGENT=1 or CI=1 for compact machine-oriented logs (no heartbeats/banners).
set -eu

MODE="${1:-verify}"
if [ "$MODE" != "quick" ] && [ "$MODE" != "verify" ]; then
  printf 'usage: %s quick|verify\n' "$0" >&2
  exit 2
fi

export PATH="${HOME}/.nub/bin:${PATH:-}"
export NODE_COMPAT=1

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

COMPACT=0
if [ -n "${AGENT:-}" ] || [ -n "${CI:-}" ]; then
  COMPACT=1
fi

if [ "$COMPACT" -eq 0 ] && [ "${2:-}" != "--run" ] && command -v stdbuf >/dev/null 2>&1; then
  exec stdbuf -oL -eL sh "$0" "$MODE" --run
fi

log() {
  if [ "$COMPACT" -eq 1 ]; then
    printf '[agent] %s\n' "$1"
  else
    printf '%s\n' "$1" >&2
  fi
}

step_banner() {
  if [ "$COMPACT" -eq 1 ]; then
    log "step=$1 status=start"
  else
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "▶ $1"
    log "  $(date '+%Y-%m-%d %H:%M:%S')"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log ""
  fi
}

step_done() {
  if [ "$COMPACT" -eq 1 ]; then
    log "step=$1 status=ok"
  fi
}

heartbeat() {
  if [ "$COMPACT" -eq 1 ]; then
    return 0
  fi
  pid=$1
  label=$2
  while kill -0 "$pid" 2>/dev/null; do
    sleep 20
    kill -0 "$pid" 2>/dev/null || break
    log "  … $label still running ($(date '+%H:%M:%S'))"
  done
}

run_step() {
  name=$1
  shift
  step_banner "$name"
  if ! "$@"; then
    if [ "$COMPACT" -eq 1 ]; then
      log "step=$name status=fail"
    fi
    exit 1
  fi
  step_done "$name"
}

if [ "$COMPACT" -eq 1 ]; then
  log "pipeline=$MODE"
else
  if [ "$MODE" = "quick" ]; then
    log "Quick pipeline — sync + lint + tests (no production build)."
  else
    log "Verify pipeline — sync + lint + tests + production build."
  fi
fi

run_step sync sh -c 'nub -F @yanai-sh/site run velite && nub -F @yanai-sh/site run ensure-env && nub -F @yanai-sh/site run wrangler-types && cd apps/site && nub exec svelte-kit sync'

step_banner "lint+test"
nub -F @yanai-sh/site run check &
pid_check=$!
nub -F @yanai-sh/site run test &
pid_test=$!
heartbeat "$pid_check" "lint + svelte-check" &
hb_check=$!
heartbeat "$pid_test" "vitest" &
hb_test=$!

ec_check=0
ec_test=0
wait "$pid_check" || ec_check=$?
wait "$pid_test" || ec_test=$?
kill "$hb_check" "$hb_test" 2>/dev/null || true
wait "$hb_check" "$hb_test" 2>/dev/null || true

if [ "$ec_check" -ne 0 ]; then
  log "step=lint status=fail exit=$ec_check"
  exit "$ec_check"
fi
if [ "$ec_test" -ne 0 ]; then
  log "step=test status=fail exit=$ec_test"
  exit "$ec_test"
fi
step_done "lint+test"

if [ "$MODE" = "quick" ]; then
  log "result=ok pipeline=quick"
  exit 0
fi

run_step build sh -c 'cd apps/site && PUBLIC_TURNSTILE_SITE_KEY=0xTEST_SITE_KEY_EMBED nub exec vite build && nub exec tsx ./scripts/assert-turnstile-embed.ts'

log "result=ok pipeline=verify"
