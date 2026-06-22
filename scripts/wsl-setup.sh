#!/usr/bin/env bash
# Bootstrap a complete home-sh dev environment inside WSL2 (linux/arm64).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_VERIFY=0
for arg in "$@"; do
  case "$arg" in
    --skip-verify) SKIP_VERIFY=1 ;;
  esac
done

log() { echo "==> $*"; }
warn() { echo "==> warning: $*" >&2; }

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

export PATH="$HOME/.nub/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

log "WSL2 bootstrap ($(uname -m)) — $ROOT"

ensure_shell_profile() {
  local profile_dir="$HOME/.config/home-sh"
  local profile_file="$profile_dir/wsl-env.sh"
  local bashrc="$HOME/.bashrc"
  local marker="# home-sh wsl-env"

  mkdir -p "$profile_dir"
  cp "$ROOT/scripts/wsl-shell-snippet.sh" "$profile_file"

  if [[ -f "$bashrc" ]]; then
    sed -i '/# home-sh wsl-shell-snippet/,/^\. "\$HOME\/.cargo\/env"$/d' "$bashrc" 2>/dev/null || true
    if ! grep -qF "$marker" "$bashrc"; then
      log "updating ~/.bashrc ($marker)"
      {
        echo ""
        echo "$marker"
        echo "[[ -f \"\$HOME/.config/home-sh/wsl-env.sh\" ]] && source \"\$HOME/.config/home-sh/wsl-env.sh\""
      } >> "$bashrc"
    fi
  fi
}

install_dnf_packages() {
  command -v dnf >/dev/null || return 0
  log "system packages (dnf)"
  sudo dnf install -y \
    git gh just gcc gcc-c++ make pkgconf-pkg-config openssl-devel curl \
    nodejs npm \
    atk at-spi2-atk cups-libs libdrm libXcomposite libXdamage libXext libXfixes \
    libXrandr libgbm libxcb libxkbcommon mesa-libgbm pango alsa-lib nss nspr \
    libX11 libXcursor libXi libXtst libxshmfence \
    2>&1 | tail -20
}

find_windows_gcm() {
  local candidate
  for candidate in \
    "/mnt/c/Program Files/Git/clangarm64/bin/git-credential-manager.exe" \
    "/mnt/c/Program Files/Git/mingw64/bin/git-credential-manager.exe" \
    "/mnt/c/Program Files/Git/cmd/git-credential-manager.exe"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

install_gcm_wrapper() {
  local gcm="$1"
  local wrapper="$HOME/.local/bin/git-credential-manager-win"
  mkdir -p "$HOME/.local/bin"
  cat > "$wrapper" <<EOF
#!/usr/bin/env bash
exec "$gcm" "\$@"
EOF
  chmod +x "$wrapper"
  git config --global credential.helper manager-win
}

configure_git_auth() {
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    log "git: gh auth configured (WSL)"
    gh auth setup-git >/dev/null 2>&1 || true
    return 0
  fi

  local gcm
  if gcm="$(find_windows_gcm)"; then
    log "git: Windows Git Credential Manager ($gcm)"
    install_gcm_wrapper "$gcm"
    return 0
  fi

  warn "git auth not configured — run: gh auth login (needed for resume submodule)"
  warn "on Windows, ensure active gh account is yanai-sh: gh auth switch -u yanai-sh"
}

ensure_node_nub() {
  if ! command -v node >/dev/null 2>&1; then
    echo "node missing after dnf install" >&2
    exit 1
  fi
  node_major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$node_major" -lt 22 ]]; then
    echo "Node.js 22+ required (have $(node -v))" >&2
    exit 1
  fi
  log "node $(node -v)"

  if ! command -v nub >/dev/null 2>&1; then
    log "installing nub"
    curl -fsSL https://nubjs.com/install.sh | bash
    export PATH="$HOME/.nub/bin:$PATH"
  fi
  log "nub $(nub --version)"
}

ensure_rustup() {
  if ! command -v rustup >/dev/null 2>&1; then
    log "installing rustup (stable, for resume/ submodule)"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
    # shellcheck disable=SC1091
    source "$HOME/.cargo/env"
  fi
  log "rustup $(rustup --version)"
  rustup show active-toolchain
}

install_js_deps() {
  log "nub ci (linux/arm64 native bindings)"
  LEFTHOOK=0 nub ci
  mkdir -p node_modules
  date -Iseconds > node_modules/.wsl-toolchain
}

install_hooks() {
  if command -v git >/dev/null 2>&1; then
    log "lefthook install"
    nub exec lefthook install
  fi
}

init_submodules() {
  if ! command -v git >/dev/null 2>&1; then
    return 0
  fi
  if [[ ! -f "$ROOT/.gitmodules" ]]; then
    return 0
  fi

  log "git submodule update"
  configure_git_auth

  if [[ -d "$ROOT/resume" && ! -e "$ROOT/resume/.git" ]]; then
    if [[ -z "$(ls -A "$ROOT/resume" 2>/dev/null || true)" ]]; then
      log "removing empty resume/ from failed clone"
      rmdir "$ROOT/resume" 2>/dev/null || rm -rf "$ROOT/resume"
    fi
  fi

  export GIT_TERMINAL_PROMPT=0
  if timeout 180 git submodule update --init --recursive; then
    log "submodules ready"
  else
    warn "submodule init failed — run: gh auth login (WSL) or fix Windows gh auth for yanai-sh"
  fi
}

install_playwright() {
  log "playwright chromium (linux/arm64)"
  nub exec playwright install chromium
  nub exec playwright install-deps chromium 2>/dev/null || warn "playwright install-deps skipped (may need sudo)"
}

run_verify() {
  log "nub run fix (normalize formatting after Windows edits)"
  nub run fix || true
  log "nub run verify"
  nub run verify
}

install_dnf_packages
ensure_shell_profile
configure_git_auth
ensure_node_nub
ensure_rustup
install_js_deps
install_hooks
init_submodules
install_playwright

if [[ "$SKIP_VERIFY" -eq 0 ]]; then
  run_verify
else
  warn "skipped verify (--skip-verify)"
fi

log "WSL2 environment ready"
log "  dev:     nub run dev"
log "  verify:  nub run verify"
log "  preview: nub run preview"
log "  smoke:   nub run smoke"
