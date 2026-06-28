#!/usr/bin/env sh
# Agent entrypoint — quiet pipeline, correct cwd, no interactive banners.
# Usage: agent-test.sh quick|verify|qa|smoke
set -eu

export AGENT=1
export NODE_COMPAT=1
export PATH="${HOME}/.nub/bin:${PATH:-}"

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

mode="${1:-}"
if [ -z "$mode" ]; then
  printf 'usage: %s quick|verify|qa|smoke\n' "$0" >&2
  exit 2
fi

printf '[agent] repo=%s mode=%s\n' "$root" "$mode"

case "$mode" in
  quick)
    exec sh scripts/ci-pipeline.sh quick
    ;;
  verify)
    exec sh scripts/ci-pipeline.sh verify
    ;;
  qa)
    sh scripts/ci-pipeline.sh verify
    exec nub run -F @yanai-sh/site smoke
    ;;
  smoke)
    exec nub run -F @yanai-sh/site smoke
    ;;
  *)
    printf 'usage: %s quick|verify|qa|smoke\n' "$0" >&2
    exit 2
    ;;
esac
