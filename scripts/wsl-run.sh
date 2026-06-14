#!/usr/bin/env bash
# Run a command in the repo with Linux/arm64 node_modules (WSL2).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "usage: scripts/wsl-run.sh <command...>" >&2
  exit 1
fi

cd "$ROOT"

has_linux_workerd() {
  compgen -G "$ROOT/node_modules/.pnpm/@cloudflare+workerd-linux-arm64@*/node_modules/@cloudflare/workerd-linux-arm64/bin/workerd" >/dev/null
}

ensure_linux_deps() {
  if has_linux_workerd; then
    return 0
  fi

  echo "wsl-run: Linux/arm64 node_modules missing — running pnpm install in WSL..." >&2

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "wsl-run: install pnpm in WSL first (pnpm run setup:wsl)" >&2
    exit 1
  fi

  if [[ -f "$ROOT/.node-version" ]]; then
    required="$(tr -d '\r\n' < "$ROOT/.node-version")"
    current="$(node -p "process.versions.node.split('.').slice(0,2).join('.')")"
    major="${required%%.*}"
    if [[ "${current%%.*}" -lt "$major" ]]; then
      echo "wsl-run: Node $required+ required (have $current). Run: pnpm run setup:wsl" >&2
      exit 1
    fi
  fi

  LEFTHOOK=0 pnpm install --no-frozen-lockfile
  mkdir -p node_modules
  date -Iseconds > node_modules/.wsl-toolchain
}

ensure_linux_deps
export PATH="${HOME}/.cargo/bin:${HOME}/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
exec "$@"
