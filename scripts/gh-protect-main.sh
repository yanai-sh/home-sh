#!/usr/bin/env bash
# Apply a branch ruleset for `main` via GitHub API (same as Settings → Rules → Rulesets).
#   - Require pull request before merge (0 approvals)
#   - Block force pushes and branch deletion
#   - Prefer requiring checks "yanai-sh / verify (ubuntu-latest)" + macos (falls back if GitHub rejects unknown context)
#
# Usage: ./scripts/gh-protect-main.sh
# Requires: gh CLI, admin on repo, `repo` scope.

set -euo pipefail
REPO="${GITHUB_REPOSITORY:-yanai-sh/yanai-sh.github.io}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> POST rulesets on ${REPO}"
if ! gh api "repos/${REPO}/rulesets" --method POST --input "$ROOT/scripts/ruleset-protect-main.json" 2>/tmp/gh-ruleset.err; then
  cat /tmp/gh-ruleset.err >&2 || true
  echo "==> Retrying without required_status_checks (add yanai-sh verify checks in UI after first green CI run)…" >&2
  gh api "repos/${REPO}/rulesets" --method POST --input "$ROOT/scripts/ruleset-protect-main-no-ci-check.json"
fi

echo "==> Rulesets:"
gh api "repos/${REPO}/rulesets" --jq '.[] | {id, name, enforcement}'
