## This repository

**Bun monorepo** — Astro 6 SSR site as a Cloudflare Worker (Workers with Static Assets) + Rust/WASM modules (`/api/contact` and `/api/telemetry/*` ship in that same Worker). Design and CI/deploy choices: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

### Monorepo layout

```
apps/
  site/        # Astro 6 app (Cloudflare adapter) — the deployed site
  wasm/
    bridge/    # SharedArrayBuffer bridge — shared state struct (bytemuck)
    canvas/    # Lyon canvas renderer — geometric node-lattice
    search/    # Nucleo fuzzy search — runs in Web Worker via Comlink
infra/
  README.md   # Infra ops: secrets layout, workflows, OpenTofu pointers
  secrets/    # Worker secret *shape* (example JSON); real values gitignored + GitHub Actions
  migrations/ # D1 SQL migrations (telemetry schema; bind + apply via `apps/site/wrangler.jsonc`)
  tofu/       # OpenTofu — `ACCESS_WORKERS.md` for optional Zero Trust on workers.dev
```

### Astro app (`apps/site/src/`)

```
pages/       # index.astro, 404.astro
layouts/     # Layout.astro — injects rootCss via buildRootCss()
components/  # .astro UI components; icons/ subdir
lib/         # edge helpers + unit tests (*.test.ts colocated)
__tests__/   # API handler tests (*.test.ts), outside `pages/` so Vite does not bundle them into the Worker SSR graph
config/      # site.ts — canonical title, URL, email, brand constants
design/      # tokens.ts + build-root-css.ts
middleware.ts # security headers (CSP, HSTS, etc.)
```

Path aliases (`apps/site/tsconfig.json`): `@/` → `src/`, `@components/*`, `@layouts/*`, `@lib/*`, `@config/*`.

Client-only scripts follow `*-client.ts` naming and are loaded as `<script>` tags (never imported at build time).

### Design tokens

Canonical values live in **`src/design/tokens.ts`**. **`buildRootCss()`** in **`src/design/build-root-css.ts`** flattens them into **`:root`** custom properties in **`Layout.astro`**. Use **`var(--…)`** in components; a few legacy names (**`--blue`**, **`--green`**, **`--grid-line`**, etc.) are preserved via overrides. Extend **`tokens`** for new UI instead of hard-coding colors.

### Scripts (copy-paste, run from repo root)

- **`bun run dev`** — Astro dev server
- **`bun run check`** / **`bun run fix`** — Biome (lint + format; `fix` writes)
- **`bun run typecheck`** — `astro check`
- **`bun run test`** — unit tests in `apps/site/src`
- **`bun run verify`** — `check` → `typecheck` → `test` → `build` (same as PR CI and Deploy on `main`)
- **`bun run preview`** — strips reserved `ASSETS` in `apps/site/dist/**/wrangler.json`, then **`astro preview`** (workerd; run **`build`** first)

### GitHub Actions

- **CI** (`.github/workflows/ci.yml`): **`pull_request`** to **`main`** — job **`CI / verify`**.
- **CI (dev)** (`.github/workflows/ci-dev.yml`): **`pull_request`** to **`dev`** — job **`CI (dev) / verify`** (same **`bun run verify`**; optional ruleset required check for the **`dev`** branch).
- **Deploy** (`.github/workflows/deploy.yml`): **`push`** to **`dev`** or **`main`** (and **`workflow_dispatch`**) — runs **`verify`**, then **`wrangler versions upload`** (staging uses **`--name yanai-sh-staging`** on `dev`; production promotes on `main`). No **`pull_request`** trigger: avoids uploading twice when a PR merges into `dev`. Project-pinned wrangler 4.x; config from **`apps/site/dist/server/wrangler.json`** after build.

### Local hooks

After **`bun install`**, **`prepare`** runs **Lefthook** (skipped when **`CI`** is set). **`pre-push`** runs **`bun run verify`**. To skip: **`LEFTHOOK=0`** or **`git push --no-verify`** (use sparingly).

### Bun defaults

Use **Bun** (`bun install`, `bun run`, `bun test`, `bunx`), not npm/yarn/pnpm. Bun loads **`.env`** automatically—no **dotenv** package.

This repo is **not** a **`Bun.serve` + HTML-import** app. For generic Bun APIs (`Bun.serve`, `bun:sqlite`, bundling, etc.), use the official [Bun documentation](https://bun.sh/docs).

### Local Cloudflare cache

**`.wrangler/`** (under `apps/site/`) is Wrangler's local cache (gitignored). Safe to delete; recreated on **`bun run preview`**.

**`target/`** is Rust's build cache (gitignored). Safe to delete; recreated on next `cargo build`.
