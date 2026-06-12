#!/usr/bin/env bash
set -euo pipefail

bashrc="$HOME/.bashrc"
profile_dir="$HOME/.config/home-sh"
profile_file="$profile_dir/wsl-env.sh"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$profile_dir"
cp "$root/scripts/wsl-shell-snippet.sh" "$profile_file"

if [[ -f "$bashrc" ]]; then
  grep -v 'home-sh wsl-shell-snippet' "$bashrc" | grep -v '^\.$HOME/.cargo/env' > "${bashrc}.tmp" || true
  mv "${bashrc}.tmp" "$bashrc"
  if ! grep -qF 'home-sh wsl-env' "$bashrc"; then
    cat >> "$bashrc" <<'EOF'

# home-sh wsl-env
[[ -f "$HOME/.config/home-sh/wsl-env.sh" ]] && source "$HOME/.config/home-sh/wsl-env.sh"
EOF
  fi
  bash -n "$bashrc"
fi

echo "repaired bashrc and installed $profile_file"
