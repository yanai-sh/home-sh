# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **library** dependencies. **Site release tags** use SemVer **`v0.y.z`** (pre-1.0); the first tag after any legacy **`v1+.*`** line is **`v0.1.0`** (hard reset).

## [Unreleased]

## [v0.1.14] - 2026-06-12

### Fixed

- **Production routing** — Set **`assets.run_worker_first`** so Hono SSR serves `/`, `/resume`, and API routes instead of a stale Astro **`index.html`** left in the static asset namespace.

## [v0.1.13] - 2026-06-12

### Changed

- **Big-bang stack migration** — Replaced **Astro 6 + Bun + Biome** with **Hono + hono/jsx**, **VoidZero Vite+** (`vp`: Oxlint, Oxfmt, Vitest, Rolldown), **Velite** content collections, **`@cloudflare/vite-plugin`**, and **pnpm** workspaces. Deploy artifact: **`apps/site/dist/wrangler.json`**. CI composites: **`pnpm-install`**, **`pnpm-verify`**. Operational docs (**`README.md`**, **`infra/*`**, **`ROADMAP.md`**, script headers) updated to match.
- **Splash UX** — Minimal split-pane shell (resume PDF, contact, project detail), flow-field canvas WASM, project rows with GitHub metadata; search WASM removed.
- **Canvas WASM** — Flow field reacts to site mode, split progress, contact-form lifecycle (length only), and resume PDF load state.
- **Contact** — **`POST /api/contact`** with Turnstile + Resend on deployed origins; **`/resume.pdf`** proxies latest **`yanai-sh/resume`** GitHub Release asset via **`RESUME_REPO_TOKEN`**.
- **Deploy** — production **git**/**GitHub Release** tags are SemVer **`v0.y.z`**. **Staging** uploads use **`dev-<run_id>`** only (no git tags on **`dev`**).
- **Dependabot** — **monthly** schedule, **pnpm** updates grouped (runtime / tooling / root scripts), lower concurrent PR limits.
- **Local** — **direnv** (`.envrc`) scopes **Git**/**`gh`** to **`yanai-sh`** under this repo via **`GIT_CONFIG_*`** and optional **`GH_TOKEN`**. **Windows ARM64** routes JS tooling through **WSL2** (`pnpm run setup:wsl`).

## [2.7.0] - 2026-05-10

### Added

- **`resume/`** git submodule (**`yanai-sh/resume`**) — HTML resume surfaces pin upstream **`resume.toml`**; **`bun run sync:resume`** writes **`content/resume.generated.json`** with **Zod** validation.
- **`.github/actions/*`** composites — **`bun-install`**, **`bun-verify`**, **`actionlint`**, **`playwright-chromium`** shared across **CI**, **Deploy**, and **Rollback**.

### Removed

- **`CONTRIBUTING.md`** — maintainer workflow folded into **`AGENTS.md`**.
- **`.github/workflows/lint-workflows.yml`** — **actionlint** runs from **CI** / **Deploy** via **paths-filter** instead.
- **Per-request GitHub Contents fetch** for resume HTML — no middleware hydration; **`resume-remote.ts`** is **`embeddedResumeSnapshot()`** only.
- Direct **`smol-toml`** dependency on **`apps/site`** (sync script uses **Bun** **`TOML.parse`**).

### Changed

- **CI / Deploy / Rollback** — **`actions/checkout`** with **`submodules: recursive`** and **`token: ${{ secrets.RESUME_REPO_TOKEN }}`** so runners can clone the **private** **`resume`** submodule; **`verify`** always runs **`sync:resume`** against the pin.
- **`scripts/sync-resume.ts`** — reads **`resume/resume.toml`** only; records submodule **SHA** in **`resume.generated.json`** provenance.
- **`Rollback` workflow** — root **`bun run build`** (runs **`sync:resume`** + Astro) before **`wrangler versions deploy`**.
- **`ResumeShowcase.astro`** — data-driven focus chips, section decks, quick links from **`resume.links`**, two-column project grid, languages row; **`HOME_RESUME_SECTION_DECK`** in **`apps/site/src/config/site.ts`**.
- **`ROADMAP.md`** — documents submodule pipeline, HTML vs PDF split, revised milestones and risks.
- **`README.md`**, **`CLAUDE.md`**, **`AGENTS.md`**, **`infra/secrets/README.md`**, **`.envrc`** — point to **`AGENTS.md`** for maintainer setup; **`PUBLIC_TURNSTILE_SITE_KEY`** / submodule notes.

- **GitHub Actions** — workflows use a **`yanai-sh / …`** naming scheme; **actionlint** runs on every PR and deploy; shared **`.github/actions/bun-install`**, **`bun-verify`**, **`playwright-chromium`**; **`dorny/paths-filter`** pinned by SHA.

- **Deploy smoke preflight** — run inline **`bun`** script via heredoc so **actionlint** / shellcheck no longer flags SC2016 on **`deploy.yml`**.

## [2.6.0] - 2026-05-10

### Added

- **Home hero Rust lattice** — lazy-loaded **`/wasm/canvas`** behind the headline (idle after load, visibility-gated rAF, coarse-pointer frame skip); shared **`loadCanvasWasm()`** with **`/workspace`** so the module warms once per session.
- **Panda `heroCta` recipe** + **`colors.hero.*`** tokens — homepage resume CTAs use generated classes from **`@yanai-sh/ui-system`**.
- **Opt-in `ClientRouter`** on **`/`** only (Astro view transitions / client routing without affecting **`/workspace`** focus smoke).

- **`infra/README.md`** + **`infra/secrets/`** — operator docs for secrets layout, workflows, and optional Terraform Cloud backend (`tofu/backend.tf.example`).
- **`scripts/optional/bitwarden-to-secrets.ts`** — optional Bitwarden CLI importer (not used by CI); run via **`bun run optional:bitwarden-to-secrets`**.
- **`.github/workflows/push-worker-secrets.yml`** — `workflow_dispatch` to sync the Workers Secrets Store from GitHub **Environment** secrets (fallback: repo secrets).
- **`GET /resume.pdf`** as a site Worker route — streams **`YanaiKlugman_CV_*.pdf`** from **`yanai-sh/resume`**’s latest GitHub Release (API + asset download). Binding **`RESUME_REPO_TOKEN`** (Secrets Store via **`push-secrets`** / GitHub Environment secrets).

### Removed

- **Tracked `infra/tofu/secrets.enc.json`** — SOPS ciphertext no longer in version control (keep a local copy if needed; path is gitignored).

- **`bun run gen:pdf`** / **`scripts/generate-resume-pdf.ts`** — no build-time or static **`dist/client/resume.pdf`**.
- Astro **content collection** for resume — **`getEntry('resume', 'current')`** replaced by **`Astro.locals.resumeSnapshot`** populated in middleware (`resume-remote.ts`).

### Changed

- **`apps/site` typecheck** — runs **`panda codegen`** before **`astro check`** so CI resolves imports from gitignored **`styled-system/`** on a clean checkout.

- **Contact section** — higher fixed anchor with scroll scene, stronger panel/field contrast, Panda contact surface tokens tweaked.
- **Hero wordmark** — accent segment uses **`var(--colors-accent)`** instead of a hard-coded hex.

- **Bitwarden helper** — moved to **`scripts/optional/`**; npm script is **`optional:bitwarden-to-secrets`**. CI and **`verify`** never invoke it; portable secrets remain GitHub Actions + gitignored JSON only.

- **Secrets model** — **`scripts/push-secrets.ts`** reads **`infra/secrets/worker-secrets.local.json`** (gitignored) or **`PUSH_SECRETS_FROM_ENV`** in CI; **`.envrc`** loads the same JSON. Legacy committed **`infra/tofu/secrets.enc.json`** (SOPS) removed from version control.

- **Deploy** — dropped pre-build PDF download, Playwright Chromium install, and **`gen:pdf`** steps; production PDF is always fetched on demand at the edge.

- **`/resume`** and home/workspace resume excerpts — hydrate from live **`resume.toml`** in **`yanai-sh/resume`** (GitHub Contents API, **`RESUME_REPO_TOKEN`**), cached ~120s at the edge, with **`content/resume.generated.json`** fallback when GitHub fails or no token (**`sync:resume`** still writes that artifact for offline builds).

- **`@yanai-sh/ui-system`** — **`@pandacss/dev`** raised to **`^1.11.0`** so presets match **`apps/site`** after **`npm-check-updates`** (fixes **`panda.config.ts`** Preset type errors).

- **`scripts/sync-resume.ts`** — also reads **`RESUME_REPO_TOKEN`** when **`RESUME_GITHUB_TOKEN`** / **`GITHUB_TOKEN`** are unset (same PAT as the Worker **`resume_repo_token`** binding).

## [2.3.0] - 2026-05-06

### Added

- **Telemetry (M6)** — live aggregate telemetry in **`/workspace#telemetry`**, backed by **`home-sh-telemetry` D1** bound as **`DB`** on the site Worker (`apps/site/wrangler.jsonc`). **`POST /api/telemetry/beacon`** validates UUIDv4 clients, caps **`frame_samples`** at 300, and stores **`CF-IPCountry`** (never client IP); **`GET /api/telemetry/stats`** returns totals, 30‑day sessions, AVG LCP / FPS, top countries (aggregated only), device breakdown — **cached 60s** with stale‑while‑revalidate, **JSON without session ids**. **`mountTelemetry`** in `telemetry-client.ts` sends **`sendBeacon` on pagehide**, captures LCP via **`PerformanceObserver`**, samples FPS on an rAF ticker, reacts to **`telemetry:wasm-ready`** from **`workspace-wip-client.ts`**, and honors **`navigator.doNotTrack`** (`1` / `yes`) plus **`localStorage['telemetry:opt-out']`** without breaking the page. **`mountTelemetryStats`** fills **`data-telemetry-stat`** slots fail‑soft.

### Removed

- **Skeleton Workers** **`infra/workers/telemetry-{read,write}/`** — never deployed; superseded by the site Worker routes.

### Changed

- **`just migrate-local` / `migrate-remote`** and **`worker-types`** now run from **`apps/site`** with **Wrangler** against the Astro Worker config (**`deploy-telemetry`** dropped).
- **`AGENTS.md`**, **`CLAUDE.md`**, and **`infra/tofu/outputs.tf`** clarify that telemetry ingress is the **site Worker**.

## [2.2.0] - 2026-05-06

### Added

- **Workspace Alpha (M5)** — animated WASM canvas in the projects pane (rAF loop reads mouse_x/y from the bridge SAB and feeds them to `render_lattice`; gated by `IntersectionObserver` to pause when the pane is off-screen). Pane headings are programmatically focusable, and hash navigation (initial-load deep links + nav-link clicks) moves focus into the pane so screen readers announce the heading. Reduced-motion users get a single-column projects pane with the canvas frame hidden entirely. Smoke suite at `apps/site/tests/smoke/workspace.spec.ts` locks every M5 acceptance gate: deep-link viewport, focus management, runtime-strip status transitions, reduced-motion layout, WASM-failure fallback, COOP/COEP header scope, mobile pane-nav layout.

## [2.1.0] - 2026-05-06

### Added

- **Workers Secrets Store** as the source-of-binding for runtime secrets (`TURNSTILE_SECRET`, `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`). Account-level store `yanai-sh-prod` bound to the site Worker via `secrets_store_secrets` in `apps/site/wrangler.jsonc`; values pushed from SOPS by `bun run scripts/push-secrets.ts` (or `just push-secrets`).
- **Contact endpoint hardening** — server-side honeypot (`website` field, silent 200 on bot fill), Cloudflare Workers Rate Limiting binding (`CONTACT_RATE_LIMIT`, 5 requests / IP / minute), stable error-code module at `apps/site/src/lib/contact-error-codes.ts` mapped to user-friendly strings client-side, and `console.error` of Resend rejection bodies for observability.
- **Astro content collection** for the resume snapshot — Zod schema at `apps/site/src/content/resume-schema.ts` is the single source of truth; both `/resume` and the homepage `ResumeShowcase` consume `getEntry('resume', 'current')`. Sync helpers extracted into `scripts/lib/sync-resume-normalize.ts` with unit tests.
- **Build-time `resume.pdf`** via headless Playwright printing the SSR'd `/resume` route at deploy time (`scripts/generate-resume-pdf.ts`); CI generates it after `verify` and before Worker upload. No committed `resume.pdf` (optional LaTeX release asset may land in **untracked** `apps/site/public/`; smoke runs **`gen:pdf`** before preview).
- **First-viewport resume CTAs** in `Lede.astro` (`View resume` / `Download PDF`) — readable without WASM/JS.
- **Playwright smoke suite** at `apps/site/tests/smoke/landing.spec.ts` covering CTAs, `/resume`, `/resume.pdf`, `/workspace`, 404, reduced-motion, contact form sitekey, and mobile viewport.
- **Versioned Worker deploys** — CI runs `wrangler versions upload` then `versions deploy <id>@100%`, tagging each version with the commit SHA.
- **Manual rollback workflow** (`.github/workflows/rollback.yml`) — `workflow_dispatch` accepts a target version id, promotes it to 100%, and smoke-checks `/` and `/resume`.
- **Monthly token-expiry probe** (`.github/workflows/token-expiry-check.yml`) — opens a GitHub issue when the Cloudflare API token has ≤30 days remaining; gracefully no-ops when the `User Details: Read` scope is missing.
- **Documented release + rollback procedures** in `ARCHITECTURE.md` (Worker rollback paths, adjacent failure modes) and maintainer workflow in `AGENTS.md` (changelog → tag → push → smoke checklist).
- **Branch protection ruleset** on `main` — PRs required, CI/`verify` status check gates merges, no force-push.

### Changed

- **Runtime migrated** from **Cloudflare Pages** to **Cloudflare Workers with Static Assets** per the `@astrojs/cloudflare` v13 default output. Deploy command in CI is now **`wrangler deploy`** (project-pinned wrangler 4.x) against `apps/site/dist/server/wrangler.json`. Custom domain `yanai.sh` bound via Workers Custom Domain (Tofu-managed).
- **Contact handler consolidated** into the site Worker as an Astro API route at **`/api/contact`** (replaces the standalone `yanai-sh-contact` Worker). Single ingress for `yanai.sh`; removes the per-route IAM scope and one deploy artifact.
- **OpenTofu provider bumped** **`cloudflare/cloudflare ~> 4.0` → `~> 5.0`**. State migrated for D1, KV, Turnstile (state rm + re-import). New `cloudflare_workers_custom_domain.yanai_sh` resource declares the apex binding. Worker script content stays a CI/CD artifact, not Tofu-managed.
- **Project secrets** live in a SOPS-encrypted file at `infra/tofu/secrets.enc.json`, exposed locally via direnv (`.envrc`) and pushed to Workers via `push-secrets`. OpenTofu uses gitignored `terraform.tfvars` and GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) instead of decrypting SOPS on the runner.
- **Resend sender domain** scoped to `send.yanai.sh` (verified subdomain) so the apex `yanai.sh` SPF record can stay dedicated to Cloudflare Email Routing without conflict.
- **COOP/COEP headers** scoped to `/workspace` only (middleware + `_headers`) so the rest of the site doesn't pay the cross-origin-isolation cost.
- **CI concurrency** — Deploy + Rollback queue (`cancel-in-progress: false`) so back-to-back merges don't cancel each other's deploys; CI keeps `cancel-in-progress: true` for stale-PR pushes.
- **CI** runs on **pull requests to `main` only**; **Deploy** still runs **`verify`** on every **`push` to `main`**.
- **Tooling:** remove Renovate, PR template, Commitizen, commitlint, and git-cliff; **Lefthook** keeps **`pre-push` → `verify`** only; optional **monthly Dependabot** for Bun + GitHub Actions (`.github/dependabot.yml`).

## [2.0.0] - 2026-04-23

**Baseline:** **Astro 6** (SSR) on **Cloudflare Pages**, **Bun** + **Biome 2**, **CI** (verify on PRs to `main`) and **Deploy** (Node 22 for `astro check`, `wrangler pages deploy`). Trunk is **`main`** with **Lefthook** pre-push; dependency automation described in [ARCHITECTURE.md](ARCHITECTURE.md).

### Added

- **Lefthook** **`pre-push`** running **`bun run verify`** (mirrors CI).

### Changed

- **`prepare`:** skips **Lefthook** install when **`CI`** is set (CI runners do not need hooks).
