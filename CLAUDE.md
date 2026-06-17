# Project context

**Read [AGENTS.md](AGENTS.md) first** for architecture, layout, and full command list. [ARCHITECTURE.md](ARCHITECTURE.md) covers design rationale.

## Cold-start essentials

- **pnpm monorepo** — **SvelteKit 5 + `@sveltejs/adapter-cloudflare`** site as a Cloudflare Worker with Static Assets; `/api/contact`, **`/resume.pdf`** (Release proxy; **`RESUME_REPO_TOKEN`**), on the site Worker. Optional **`resume/`** submodule (Rust PDF). Toolchain: **Vite+** (`vp check`: Oxlint, Oxfmt, tsgo), **svelte-check**, **Vitest**, **Velite**.
- **pnpm + Vite+** — `pnpm install`, `pnpm run`, `vp dev` / `vite dev/build`. Node **22+** (`.node-version`).
- **Verify before claiming done:** `pnpm run verify` (= `vp check` + svelte-check → test → build; mirrors PR CI). **`pnpm run smoke`** — Playwright smoke (`apps/site`). **Windows ARM64:** run **`pnpm run setup:wsl`** once, then all scripts use **WSL2** automatically.
- **Polyglot tasks:** `just --list` (Workers, OpenTofu). Infra: **[infra/README.md](infra/README.md)**.
- **CSS:** Tailwind v4 + CSS custom properties in **`src/styles/global.css`**.
- **Path aliases** (`apps/site/svelte.config.js`; `vite.config.ts`): `$lib/*`, `@config/*`, `#content` → `.velite`.
- **direnv** (`.envrc`): **`direnv allow`** → **`GIT_CONFIG_*`** scopes **Git** to **`yanai-sh`** on GitHub; **`GH_TOKEN`** from **`gh auth token -u yanai-sh`** when available.
- **Client scripts:** `*-client.ts` naming, loaded via Vite `?url` script tags.
- **Lefthook `pre-push`** runs `verify`. Skip with `LEFTHOOK=0` (rare).
