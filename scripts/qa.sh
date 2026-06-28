#!/usr/bin/env sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"
sh scripts/ci-pipeline.sh verify
nub run -F @yanai-sh/site smoke
