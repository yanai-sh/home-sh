# Project context

**Read [AGENTS.md](AGENTS.md) first** for architecture, layout, and full command list. [ARCHITECTURE.md](ARCHITECTURE.md) covers design rationale.

## Cold-start essentials

- **Nub monorepo** — **SvelteKit 5 + `@sveltejs/adapter-cloudflare`** site as a Cloudflare Worker with Static Assets; `/api/contact`, **`/resume.pdf`** (Release proxy; **`RESUME_REPO_TOKEN`**), on the site Worker. **`/`** uses **SplashDeck** flyout nav. Optional **`resume/`** submodule (Rust PDF). Toolchain: **Vite+** (`vp check`: Oxlint, Oxfmt, tsgo), **svelte-check**, **Vitest**, **Velite**.
- **Nub + Vite+** — `nub ci`, `nub run`, `vp dev` / `vite dev/build`. Node **24+** (`.node-version`).
- **Agents — verify before claiming done:** **`npm run agent:quick`** after edits; **`npm run agent:verify`** or **`npm run agent:qa`** when finished. Humans: **`nub run quick`** / **`verify`** / **`qa`**.
- **Polyglot tasks:** `just --list` (Workers, OpenTofu). Infra: **[infra/README.md](infra/README.md)**.
- **CSS:** Tailwind v4 + CSS custom properties in **`src/styles/global.css`**.
- **Path aliases** (`apps/site/svelte.config.js`; `vite.config.ts`): `$lib/*`, `@config/*`, `#content` → `.velite`.
- **direnv** (`.envrc`): **`direnv allow`** → **`GIT_CONFIG_*`** scopes **Git** to **`yanai-sh`** on GitHub; **`GH_TOKEN`** from **`gh auth token -u yanai-sh`** when available.
- **Client scripts:** `*-client.ts` naming, loaded via Vite `?url` script tags.
- **Lefthook `pre-push`** runs `verify`. Skip with `LEFTHOOK=0` (rare).
