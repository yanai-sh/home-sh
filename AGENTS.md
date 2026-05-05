## This repository

**Bun monorepo** — Astro 6 SSR site as a Cloudflare Worker (Workers with Static Assets) + Rust/WASM modules + standalone Cloudflare Workers under `infra/workers/`. Design and CI/deploy choices: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

### Monorepo layout

```
apps/
  site/        # Astro 6 app (Cloudflare adapter) — the deployed site
  wasm/
    bridge/    # SharedArrayBuffer bridge — shared state struct (bytemuck)
    canvas/    # Lyon canvas renderer — geometric node-lattice
    search/    # Nucleo fuzzy search — runs in Web Worker via Comlink
infra/
  workers/
    contact/          # Contact form Worker (Turnstile + Resend)
    telemetry-read/   # Aggregated stats endpoint (cached 60s)
    telemetry-write/  # Session beacon receiver → D1
  migrations/  # D1 SQL migrations (forward-only)
```

### Astro app (`apps/site/src/`)

```
pages/       # index.astro, 404.astro
layouts/     # Layout.astro — injects rootCss via buildRootCss()
components/  # .astro UI components; icons/ subdir
lib/         # edge helpers + unit tests (*.test.ts colocated)
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

- **CI** (`.github/workflows/ci.yml`): **`pull_request`** to **`main`** only — job **`CI / verify`**.
- **Deploy** (`.github/workflows/deploy.yml`): **`push`** to **`main`** — runs **`verify`**, then `wrangler deploy` of the site Worker via the project-pinned wrangler 4.x.

### Local hooks

After **`bun install`**, **`prepare`** runs **Lefthook** (skipped when **`CI`** is set). **`pre-push`** runs **`bun run verify`**. To skip: **`LEFTHOOK=0`** or **`git push --no-verify`** (use sparingly).

### Bun defaults

Use **Bun** (`bun install`, `bun run`, `bun test`, `bunx`), not npm/yarn/pnpm. Bun loads **`.env`** automatically—no **dotenv** package.

This repo is **not** a **`Bun.serve` + HTML-import** app. For generic Bun APIs (`Bun.serve`, `bun:sqlite`, bundling, etc.), use the official [Bun documentation](https://bun.sh/docs).

### Local Cloudflare cache

**`.wrangler/`** (under `apps/site/`) is Wrangler's local cache (gitignored). Safe to delete; recreated on **`bun run preview`**.

**`target/`** is Rust's build cache (gitignored). Safe to delete; recreated on next `cargo build`.
