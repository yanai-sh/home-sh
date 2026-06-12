# Project context

**Read [AGENTS.md](AGENTS.md) first** for architecture, layout, and full command list. [ARCHITECTURE.md](ARCHITECTURE.md) covers design rationale.

## Cold-start essentials

- **pnpm monorepo** — Hono + Vite 8 SSR as a Cloudflare Worker with Static Assets + Rust/WASM (`apps/wasm/*`); `/api/contact`, **`/resume.pdf`** (Release proxy; **`RESUME_REPO_TOKEN`**), on the site Worker. Toolchain: **VoidZero Vite+** (`vp`).
- **pnpm + Vite+** — `pnpm install`, `pnpm run`, `vp check/test/build`. Node **22+** (`.node-version`).
- **Verify before claiming done:** `pnpm run verify` (= sync:resume → check → test → build; mirrors CI). **`pnpm run smoke`** — Playwright smoke (`apps/site`). **Windows ARM64:** run **`pnpm run setup:wsl`** once, then all scripts use **WSL2** automatically.
- **Polyglot tasks:** `just --list` (WASM, Workers, OpenTofu). Infra: **[infra/README.md](infra/README.md)**.
- **CSS:** Tailwind v4 + CSS custom properties in **`src/styles/global.css`**.
- **Path aliases** (`apps/site/tsconfig.json`; `vite.config.ts`): `@/`, `@components/*`, `@views/*`, `@lib/*`, `@config/*`, `#content`, `@resume/generated` → `content/resume.generated.json`.
- **direnv** (`.envrc`): **`direnv allow`** → **`GIT_CONFIG_*`** scopes **Git** to **`yanai-sh`** on GitHub; **`GH_TOKEN`** from **`gh auth token -u yanai-sh`** when available.
- **Client scripts:** `*-client.ts` naming, loaded via Vite `?url` script tags.
- **Lefthook `pre-push`** runs `verify`. Skip with `LEFTHOOK=0` (rare).
