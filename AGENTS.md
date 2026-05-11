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

Path aliases (`apps/site/tsconfig.json`; Vite mirrors `@resume/generated` in `astro.config.mjs`): `@/` → `src/`, `@components/*`, `@layouts/*`, `@lib/*`, `@config/*`, `@resume/generated` → monorepo `content/resume.generated.json` (bundled resume snapshot from `sync:resume`).

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

Workflow and job names use a **`yanai-sh / …`** prefix so the Actions tab and branch checks read consistently.

- **PR — main** (`ci.yml`, workflow **`yanai-sh / PR — main`**): **`pull_request`** to **`main`** — matrix **`ubuntu-latest`** + **`macos-latest`** calling **`reusable-verify.yml`** (**`yanai-sh / Verify (reusable)`**). Required check contexts (include reusable job suffix): **`yanai-sh / verify (ubuntu-latest) / yanai-sh / verify — run`** and the macOS pair — see **`scripts/ruleset-protect-main.json`**; **`./scripts/gh-protect-main.sh`** defaults to **`yanai-sh/home-sh`**.
- **PR — dev** (`ci-dev.yml`, **`yanai-sh / PR — dev`**): **`pull_request`** to **`dev`** — same reusable verify matrix (**`yanai-sh / verify — dev (…)`**); optional ruleset required checks on **`dev`**.
- **Deploy** (`deploy.yml`, **`yanai-sh / Deploy`**): **`push`** to **`dev`** / **`main`** and **`workflow_dispatch`** (**`skip_smoke: 'true'`** skips staging smoke; **`version_bump`** on **`main`** dispatch: **patch** / **minor** on **`v0.y.z`**, or **major** → **`v1.0.0`**). Jobs: **`yanai-sh / deploy — publish`**, **`yanai-sh / deploy — version tag`** (**`main`** only), **`yanai-sh / deploy — GitHub release`** (**`main`** only), **`yanai-sh / deploy — smoke`**. No **`pull_request`** on deploy. Project-pinned wrangler 4.x; config from **`apps/site/dist/server/wrangler.json`** after build.
  - Uses GitHub **Environments** (`staging`/`production`); staging smoke uses Cloudflare Access service token headers when set.
- **Deps — auto-merge** (`dependabot-auto-merge.yml`, **`yanai-sh / Deps — auto-merge`**) — for **`dependabot[bot]`** PRs: **`gh pr merge --auto --squash --delete-branch`** (merges when required checks are green, then removes Dependabot’s head branch). Enable **Settings → General → Allow auto-merge** and keep branch rules compatible.
- **Caches** — composite **`bun-install`** restores **`~/.bun/install/cache`**; **`playwright-chromium`** restores **`~/.cache/ms-playwright`** (keyed off **`bun.lock`**). Key third-party actions use **commit SHAs** (comments note the tag).
- **Path filters** — **`dorny/paths-filter`** drives an informational summary; **actionlint** runs every PR/Deploy. **`bun run verify`** still runs on every PR (both OSes).
- **Other workflows** — **`yanai-sh / Rollback`**, **`yanai-sh / Infra — plan`**, **`yanai-sh / Secrets — push`**, **`yanai-sh / Ops — token expiry`** (`rollback.yml`, `infra-plan.yml`, `push-worker-secrets.yml`, `token-expiry-check.yml`).
- **Auth** — Wrangler **`versions upload` / `deploy`** use **`CLOUDFLARE_API_TOKEN`** from the Environment. GitHub OIDC for Workers deploy is not a drop-in replacement yet; keep the token until upstream supports it, then migrate.

### Workflow (`dev` / `main`)

Two long-lived branches, two Workers: **`yanai-sh-staging`** on **`dev`**, **`yanai-sh`** on **`main`** (same `apps/site/wrangler.jsonc`; deploy passes **`--name yanai-sh-staging`** on **`dev`**). **Deploy** runs on **`push`** to **`dev`** or **`main`**, not on **`pull_request`** into **`dev`** (avoids uploading twice when a PR merges). **Staging** uses a Wrangler-only label (**`dev-<run_id>`**); **no git tags on `dev`**. **Production** tags are SemVer **`v0.y.z`** (pre-1.0); the first deploy after any legacy **`v1+.*`** tag (e.g. **`v2.7.0`**) is **`v0.1.0`** (hard reset). Normal pushes to **`main`** bump **patch**; **minor** / **major** (including shipping **`v1.0.0`**) use **workflow_dispatch**.

**Solo loop (three beats):** (1) **`bun run verify`** locally before every push. (2) Open PRs to **`main`** (CI) and merge work into **`dev`**; each **`push`** to **`dev`** runs **Deploy** → staging Worker + optional smoke on the version preview URL. (3) When staging looks right, PR **`dev` → `main`** → production upload + promote + release. Secrets and Environment names: **`infra/README.md`**.

Day-to-day: **`git checkout dev && git pull`** → **`git submodule update --init --recursive`** if **`resume/`** is empty → topic branch → **`bun run verify`** → PR → **`dev`** → QA staging preview (smoke supports Cloudflare Access via **`CF_ACCESS_CLIENT_ID`** / **`CF_ACCESS_CLIENT_SECRET`** on the **`staging`** Environment) → PR **`dev` → `main`**. **`CHANGELOG`**: keep **`[Unreleased]`** on **`dev`**; before **`dev` → `main`**, cut a dated **`[v0.y.z]`** section aligned with the tag Deploy will create (or fix up after merge). **`./scripts/gh-protect-main.sh`** (see **`README.md`**) documents **`main`** ruleset expectations.

### Resume submodule and `RESUME_REPO_TOKEN`

HTML **`/resume`**, home resume, and **`/workspace`** search use **`content/resume.generated.json`**, produced by **`bun run sync:resume`** from the pinned **`resume/`** submodule (**`yanai-sh/resume`**, **`resume.toml`**). Bump the submodule pointer to ship upstream CV changes, then **`bun run verify`**.

**`/resume.pdf`** (GitHub Releases proxy) and local **`astro dev`** / **`preview`** when you need PDFs require **`RESUME_REPO_TOKEN`** — same PAT string as the **`staging`/`production`** GitHub Environment (Deploy syncs it to Cloudflare Secrets Store). Put it in **`apps/site/.dev.vars`** or as **`resume_repo_token`** in gitignored **`infra/secrets/worker-secrets.local.json`** (direnv); full secret shape: **`infra/secrets/README.md`**. **`/resume.pdf`** smoke only makes sense with **`SMOKE_BASE_URL`** on a deployed origin; local **`astro preview`** does not emulate Secrets Store bindings reliably.

**direnv (`.envrc`)** — After **`direnv allow`**, entering this repo exports ephemeral **`GIT_CONFIG_*`** so **Git** uses the **`yanai-sh`** login for **`https://github.com`** (credential helper hint + URL rewrite). If **`gh`** is installed and **`yanai-sh`** is in **`gh auth status`**, **`GH_TOKEN`** is set for that user only under this tree; leaving the directory clears it. Other projects are unchanged. Requires **Git 2.31+** for **`GIT_CONFIG_*`**. To make another GitHub account the default **`gh`** user again outside this tree, run **`gh auth switch -u <account>`** (or switch per session).

### Releases and rollback

A production release is whatever lands on **`main`** (Deploy auto-tags the next **`v0.y.z`** — **patch** by default). Before **`dev` → `main`**: move **`CHANGELOG`** **`[Unreleased]`** into **`## [v0.y.z] - YYYY-MM-DD`**, leave a fresh **`[Unreleased]`**. For **minor** bumps on the **`0.*`** line or shipping **`v1.0.0`**, use **Actions → Deploy → Run workflow** on **`main`** with **`version_bump`**. Watch deploy: **`gh run watch`**. Smoke prod: **`bun run --cwd apps/site smoke`** with **`SMOKE_BASE_URL=https://yanai.sh`** when needed. If prod is wrong, **`ARCHITECTURE.md`** documents Worker rollback.

### Commits, dependencies, style

Use clear messages; **Conventional Commits** are optional. **Dependabot**: **`.github/dependabot.yml`** — **monthly** **Bun** (grouped: runtime vs tooling vs root scripts) + grouped **GitHub Actions** bumps (disable under repo security settings if you want fully manual bumps). **Biome** is the source of truth for JS/TS style (**`bun run fix`**). Astro: follow existing patterns under **`apps/site/src/components/`**.

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
