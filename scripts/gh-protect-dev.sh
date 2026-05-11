#!/usr/bin/env bash
# Apply a branch ruleset for `dev` via GitHub API (Settings → Rules → Rulesets).
#   - Block branch deletion (avoids losing staging / post-merge “delete branch” mistakes)
#   - Block force pushes (non–fast-forward updates)
#
# Does not require PRs or status checks on `dev` — direct pushes stay allowed for Deploy.
#
# Usage: ./scripts/gh-protect-dev.sh
# Requires: gh CLI, admin on repo, `repo` scope.

set -euo pipefail
REPO="${GITHUB_REPOSITORY:-yanai-sh/home-sh}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> POST ruleset \"Protect dev\" on ${REPO}"
gh api "repos/${REPO}/rulesets" --method POST --input "$ROOT/scripts/ruleset-protect-dev.json"

echo "==> Rulesets:"
gh api "repos/${REPO}/rulesets" --jq '.[] | {id, name, enforcement}'
