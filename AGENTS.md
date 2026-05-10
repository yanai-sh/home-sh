## This repository

**Bun monorepo** — Astro 6 SSR site as a Cloudflare Worker (Workers with Static Assets) + Rust/WASM modules (`/api/contact` and `/api/telemetry/*` ship in that same Worker). Design and CI/deploy choices: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

### Monorepo layout

```
resume/      # git submodule → yanai-sh/resume (canonical resume.toml; bump pointer to ship CV changes)
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
- **`bun run smoke`** — Playwright smoke tests (`apps/site/tests/smoke`; starts local preview unless **`SMOKE_BASE_URL`** is set)

### GitHub Actions

- **CI** (`.github/workflows/ci.yml`): **`pull_request`** to **`main`** — job **`CI / verify`**.
- **CI (dev)** (`.github/workflows/ci-dev.yml`): **`pull_request`** to **`dev`** — job **`CI (dev) / verify`** (same **`bun run verify`**; optional ruleset required check for the **`dev`** branch).
- **Deploy** (`.github/workflows/deploy.yml`): **`push`** to **`dev`** or **`main`** (and **`workflow_dispatch`**) — runs **`verify`**, then **`wrangler versions upload`** (staging uses **`--name yanai-sh-staging`** on `dev`; production promotes on `main`). No **`pull_request`** trigger: avoids uploading twice when a PR merges into `dev`. Project-pinned wrangler 4.x; config from **`apps/site/dist/server/wrangler.json`** after build.
  - Deploy uses GitHub **Environments** (`staging`/`production`) for CI secrets; staging also runs smoke against the immutable preview URL via Cloudflare Access service token headers.

### Workflow (`dev` / `main`)

Two long-lived branches, two Workers: **`yanai-sh-staging`** on **`dev`**, **`yanai-sh`** on **`main`** (same `apps/site/wrangler.jsonc`; deploy passes **`--name yanai-sh-staging`** on **`dev`**). **Deploy** runs on **`push`** to **`dev`** or **`main`**, not on **`pull_request`** into **`dev`** (avoids uploading twice when a PR merges). Auto-tags: **patch** on **`dev`**, **minor** on **`main`**; **major** tags stay manual.

Day-to-day: **`git checkout dev && git pull`** → **`git submodule update --init --recursive`** if **`resume/`** is empty → topic branch → **`bun run verify`** → PR → **`dev`** → QA staging preview (smoke supports Cloudflare Access via **`CF_ACCESS_CLIENT_ID`** / **`CF_ACCESS_CLIENT_SECRET`** on the **`staging`** Environment) → PR **`dev` → `main`**. **`CHANGELOG`**: keep **`[Unreleased]`** on **`dev`**; cut a dated **`[vX.(Y+1).0]`** section in a chore PR before **`dev` → `main`**. **`./scripts/gh-protect-main.sh`** (see **`README.md`**) documents **`main`** ruleset expectations.

### Resume submodule and `RESUME_REPO_TOKEN`

HTML **`/resume`**, home resume, and **`/workspace`** search use **`content/resume.generated.json`**, produced by **`bun run sync:resume`** from the pinned **`resume/`** submodule (**`yanai-sh/resume`**, **`resume.toml`**). Bump the submodule pointer to ship upstream CV changes, then **`bun run verify`**.

**`/resume.pdf`** (GitHub Releases proxy) and local **`astro dev`** / **`preview`** when you need PDFs require **`RESUME_REPO_TOKEN`** — same PAT string as the **`staging`/`production`** GitHub Environment (Deploy syncs it to Cloudflare Secrets Store). Put it in **`apps/site/.dev.vars`** or as **`resume_repo_token`** in gitignored **`infra/secrets/worker-secrets.local.json`** (direnv); full secret shape: **`infra/secrets/README.md`**. **`/resume.pdf`** smoke only makes sense with **`SMOKE_BASE_URL`** on a deployed origin; local **`astro preview`** does not emulate Secrets Store bindings reliably.

### Releases and rollback

A production release is whatever lands on **`main`** (Deploy auto-tags the next **minor**). Before **`dev` → `main`**: move **`CHANGELOG`** **`[Unreleased]`** into **`## [vX.(Y+1).0] - YYYY-MM-DD`**, leave a fresh **`[Unreleased]`**. For a **major**, tag manually after merge (**`git tag -a vX.0.0`** …). Watch deploy: **`gh run watch`**. Smoke prod: **`bun run --cwd apps/site smoke`** with **`SMOKE_BASE_URL=https://yanai.sh`** when needed. If prod is wrong, **`ARCHITECTURE.md`** documents Worker rollback.

### Commits, dependencies, style

Use clear messages; **Conventional Commits** are optional. **Dependabot**: **`.github/dependabot.yml`** — monthly **Bun** + **GitHub Actions** (disable under repo security settings if you want fully manual bumps). **Biome** is the source of truth for JS/TS style (**`bun run fix`**). Astro: follow existing patterns under **`apps/site/src/components/`**.

### Optional maintainer tooling

- **`scripts/optional/`** — never run by CI or **`verify`**. Example: **`bun run optional:bitwarden-to-secrets`** (Bitwarden CLI → local JSON / `gh`). See **`scripts/optional/README.md`**.

### Local hooks

After **`bun install`**, **`prepare`** runs **Lefthook** (skipped when **`CI`** is set). **`pre-push`** runs **`bun run verify`**. To skip: **`LEFTHOOK=0`** or **`git push --no-verify`** (use sparingly).

### Bun defaults

Use **Bun** (`bun install`, `bun run`, `bun test`, `bunx`), not npm/yarn/pnpm. Bun loads **`.env`** automatically—no **dotenv** package.

This repo is **not** a **`Bun.serve` + HTML-import** app. For generic Bun APIs (`Bun.serve`, `bun:sqlite`, bundling, etc.), use the official [Bun documentation](https://bun.sh/docs).

### Local Cloudflare cache

**`.wrangler/`** (under `apps/site/`) is Wrangler's local cache (gitignored). Safe to delete; recreated on **`bun run preview`**.

**`target/`** is Rust's build cache (gitignored). Safe to delete; recreated on next `cargo build`.
