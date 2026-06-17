## This repository

**pnpm monorepo** — **SvelteKit 5 + `@sveltejs/adapter-cloudflare`** site as a Cloudflare Worker (Workers with Static Assets); **`/api/contact`** and **`/resume.pdf`** on that Worker. Optional **`resume/`** git submodule (Rust PDF builder). Toolchain: **Vite+** (`vp check`: Oxlint, Oxfmt, tsgo), **svelte-check**, **Vitest**, **Velite**. Design and CI/deploy choices: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

### Monorepo layout

```
resume/      # optional git submodule → yanai-sh/resume (PDF source repo; not required for site build)
apps/
  site/        # SvelteKit app (@sveltejs/adapter-cloudflare) — the deployed site
infra/
  README.md   # Infra ops: secrets layout, workflows, OpenTofu pointers
  secrets/    # Worker secret *shape* (example JSON); real values gitignored + GitHub Actions
  tofu/       # OpenTofu — `ACCESS_WORKERS.md` for optional Zero Trust on workers.dev
```

### Site app (`apps/site/src/`)

```
routes/             # SvelteKit pages (+page, +layout, +server)
  api/contact/      # POST /api/contact
  resume.pdf/       # GET /resume.pdf
  resume/           # GET /resume → 308 PDF
  (doc)/            # DocumentLayout — blog, projects, uses, now
lib/
  components/       # Svelte UI (SiteMeta, ThemeToggle, IconSprite)
  server/           # contact, resume-pdf, security helpers
  splash/client.ts  # split pane, contact form, resume TOC (onMount)
hooks.server.ts     # security headers, /workspace redirect
content/            # Velite source (JSON experience, MDX projects/blog)
data/portfolio/     # splash copy (hero, nav, contact)
config/             # site.ts — canonical title, URL, email, brand constants
```

Path aliases (`apps/site/tsconfig.json`; `svelte.config.js`): `$lib/*`, `@config/*`, `#content` → `.velite`.

### Design tokens

CSS custom properties live in **`src/styles/global.css`** (`:root` / `[data-theme]`). Extend tokens there for new UI instead of hard-coding colors.

### Scripts (copy-paste, run from repo root)

- **`pnpm run dev`** — SvelteKit dev server (`vite dev`, port 4321)
- **`pnpm run check`** / **`pnpm run fix`** — `vp check` (Oxlint, Oxfmt, tsgo) + `svelte-check` + Velite sync
- **`pnpm run typecheck`** — same as **`check`**
- **`pnpm run test`** — Vitest
- **`pnpm run verify`** — Velite → `vp check` + svelte-check → test → build (same as PR CI; Deploy runs build-only)
- **`pnpm run preview`** — `wrangler dev .svelte-kit/cloudflare` (run **`build`** first)
- **`pnpm run smoke`** — Playwright smoke tests (`apps/site/tests/smoke`; starts local preview unless **`SMOKE_BASE_URL`** is set)

### GitHub Actions

Workflow and job names use a **`yanai-sh / …`** prefix so the Actions tab and branch checks read consistently.

- **PR — verify** (`ci.yml`, workflow **`yanai-sh / PR — verify`**): **`pull_request`** to **`main`** or **`dev`** — **`ubuntu-latest`** only, calling **`reusable-verify.yml`**. Required check on **`main`**: **`yanai-sh / verify / yanai-sh / verify — run`** — see **`scripts/ruleset-protect-main.json`**; **`./scripts/gh-protect-main.sh`** defaults to **`yanai-sh/home-sh`**. For long-lived **`dev`**, configure the same kind of thing in **GitHub → Settings → Rules → Rulesets** (target **`dev`**, enable **block branch deletion** and **block force pushes**, and do **not** require pull requests if you still want direct **`git push origin dev`** for Deploy).
- **Deploy** (`deploy.yml`, **`yanai-sh / Deploy`**): **`push`** to **`dev`** / **`main`** and **`workflow_dispatch`** (**`skip_smoke: 'true'`** skips staging smoke; **`version_bump`** on **`main`** dispatch: **patch** / **minor** on **`v0.y.z`**, or **major** → **`v1.0.0`**). Jobs: **`yanai-sh / deploy — publish`**, **`yanai-sh / deploy — version tag`** (**`main`** only), **`yanai-sh / deploy — GitHub release`** (**`main`** only), **`yanai-sh / deploy — smoke`**. No **`pull_request`** on deploy. Project-pinned wrangler 4.x; config from **`apps/site/wrangler.jsonc`** (build output in **`.svelte-kit/cloudflare/`**).
  - Uses GitHub **Environments** (`staging`/`production`); staging smoke uses Cloudflare Access service token headers when set.
- **Deps — auto-merge** (`dependabot-auto-merge.yml`, **`yanai-sh / Deps — auto-merge`**) — for **`dependabot[bot]`** PRs: **`gh pr merge --auto --squash --delete-branch`** (merges when required checks are green, then removes Dependabot’s head branch). Enable **Settings → General → Allow auto-merge** and keep branch rules compatible.
- **Caches** — composite **`pnpm-install`** restores **`~/.local/share/pnpm/store`**; **`playwright-chromium`** restores **`~/.cache/ms-playwright`** (keyed off **`pnpm-lock.yaml`**). Key third-party actions use **commit SHAs** (comments note the tag).
- **Path filters** — **`dorny/paths-filter`** drives an informational summary; **actionlint** runs every PR/Deploy. **`pnpm run verify`** still runs on every PR (`ubuntu-latest`).
- **Other workflows** — **`yanai-sh / Rollback`**, **`yanai-sh / Infra — plan`**, **`yanai-sh / Secrets — push`**, **`yanai-sh / Ops — token expiry`** (`rollback.yml`, `infra-plan.yml`, `push-worker-secrets.yml`, `token-expiry-check.yml`).
- **Auth** — Wrangler **`versions upload` / `deploy`** use **`CLOUDFLARE_API_TOKEN`** from the Environment. GitHub OIDC for Workers deploy is not a drop-in replacement yet; keep the token until upstream supports it, then migrate.

### Workflow (`dev` / `main`)

Two long-lived branches, two Workers: **`yanai-sh-staging`** on **`dev`**, **`yanai-sh`** on **`main`** (same `apps/site/wrangler.jsonc`; deploy passes **`--name yanai-sh-staging`** on **`dev`**). **Deploy** runs on **`push`** to **`dev`** or **`main`**, not on **`pull_request`** into **`dev`** (avoids uploading twice when a PR merges). **Staging** uses a Wrangler-only label (**`dev-<run_id>`**); **no git tags on `dev`**. **Production** tags are SemVer **`v0.y.z`** (pre-1.0); the first deploy after any legacy **`v1+.*`** tag (e.g. **`v2.7.0`**) is **`v0.1.0`** (hard reset). Normal pushes to **`main`** bump **patch**; **minor** / **major** (including shipping **`v1.0.0`**) use **workflow_dispatch**.

**Solo loop (three beats):** (1) **`pnpm run verify`** locally before every push. (2) Open PRs to **`main`** (CI) and merge work into **`dev`**; each **`push`** to **`dev`** runs **Deploy** → staging Worker + optional smoke on the version preview URL. (3) When staging looks right, PR **`dev` → `main`** → production upload + promote + release. Secrets and Environment names: **`infra/README.md`**.

Day-to-day: **`git checkout dev && git pull`** → topic branch → **`pnpm run verify`** → PR → **`dev`** → QA staging preview (smoke supports Cloudflare Access via **`CF_ACCESS_CLIENT_ID`** / **`CF_ACCESS_CLIENT_SECRET`** on the **`staging`** Environment) → PR **`dev` → `main`**. **`CHANGELOG`**: keep **`[Unreleased]`** on **`dev`**; before **`dev` → `main`**, cut a dated **`[v0.y.z]`** section aligned with the tag Deploy will create (or fix up after merge). **`./scripts/gh-protect-main.sh`** (see **`README.md`**) documents **`main`** ruleset expectations.

### Resume PDF and `RESUME_REPO_TOKEN`

The canonical resume is **`GET /resume.pdf`** — streams the latest **`YanaiKlugman_CV_*.pdf`** from **`yanai-sh/resume`** GitHub Releases. **`GET /resume`** redirects to **`/resume.pdf`**. Splash copy (name, tagline, location, current role) lives in **`apps/site/src/data/portfolio/`**.

**`/resume.pdf`** and local **`vp dev`** / **`preview`** when you need PDFs require **`RESUME_REPO_TOKEN`** — same PAT string as the **`staging`/`production`** GitHub Environment (Deploy syncs it to Cloudflare Secrets Store). Put it in **`apps/site/.dev.vars`** or as **`resume_repo_token`** in gitignored **`infra/secrets/worker-secrets.local.json`** (direnv); full secret shape: **`infra/secrets/README.md`**. **`/resume.pdf`** smoke only makes sense with **`SMOKE_BASE_URL`** on a deployed origin; local **`vp preview`** does not emulate Secrets Store bindings reliably.

**direnv (`.envrc`)** — After **`direnv allow`**, entering this repo exports ephemeral **`GIT_CONFIG_*`** so **Git** uses the **`yanai-sh`** login for **`https://github.com`** (credential helper hint + URL rewrite). If **`gh`** is installed and **`yanai-sh`** is in **`gh auth status`**, **`GH_TOKEN`** is set for that user only under this tree; leaving the directory clears it. Other projects are unchanged. Requires **Git 2.31+** for **`GIT_CONFIG_*`**. To make another GitHub account the default **`gh`** user again outside this tree, run **`gh auth switch -u <account>`** (or switch per session).

### Releases and rollback

A production release is whatever lands on **`main`** (Deploy auto-tags the next **`v0.y.z`** — **patch** by default). Before **`dev` → `main`**: move **`CHANGELOG`** **`[Unreleased]`** into **`## [v0.y.z] - YYYY-MM-DD`**, leave a fresh **`[Unreleased]`**. For **minor** bumps on the **`0.*`** line or shipping **`v1.0.0`**, use **Actions → Deploy → Run workflow** on **`main`** with **`version_bump`**. Watch deploy: **`gh run watch`**. Smoke prod: **`pnpm run --dir apps/site smoke`** with **`SMOKE_BASE_URL=https://yanai.sh`** when needed. If prod is wrong, **`ARCHITECTURE.md`** documents Worker rollback.

### Commits, dependencies, style

Use clear messages; **Conventional Commits** are optional. **Dependabot**: **`.github/dependabot.yml`** — **monthly** **pnpm** (grouped: runtime / tooling / root scripts) + grouped **GitHub Actions** bumps. **Vite+** (`vp check --fix`) is the source of truth for JS/TS style.

### Optional maintainer tooling

- **`scripts/optional/`** — never run by CI or **`verify`**. Example: **`pnpm run optional:bitwarden-to-secrets`** (Bitwarden CLI → local JSON / `gh`). See **`scripts/optional/README.md`**.

### Local hooks

After **`pnpm install`**, **`prepare`** runs **Lefthook** (skipped when **`CI`** is set). **`pre-push`** runs **`pnpm run verify`**. To skip: **`LEFTHOOK=0`** or **`git push --no-verify`** (use sparingly).

### Node / pnpm / Vite+

Use **pnpm** + **Vite+** (`vp dev`, `vp check`, `vp test`, `vp build`, `vp run verify`). Node **22+** via **`.node-version`**. **`pnpm exec tsx`** for root scripts.

**Windows ARM64 — use WSL2:** `workerd` has no **`@cloudflare/workerd-windows-arm64`** npm package yet. All **`pnpm run …`** JS commands auto-route through **WSL2** via **`scripts/wsl-proxy.mjs`**. Bootstrap once:

```bash
pnpm run setup:wsl
```

That installs Fedora packages (git, **gh**, just, node, Playwright libs), **rustup** (for the **resume/** submodule), Linux **node_modules**, **resume** submodule, **lefthook**, **Playwright chromium**, and runs **`pnpm run verify`**. Repo can stay on **`/mnt/c/...`** (Vitest uses **`pool: 'threads'`** because fork workers hang on drvfs). **Do not** run **`pnpm install`** from Windows arm64 Node.

Before first setup, on Windows run **`gh auth switch -u yanai-sh`** so the private **`resume/`** submodule can clone (or **`gh auth login`** inside WSL).

**macOS / Linux / Windows x64:** commands run locally (no WSL).

### Local Cloudflare cache

**`.wrangler/`** (under `apps/site/`) is Wrangler's local cache (gitignored). Safe to delete; recreated on **`pnpm run preview`**.

**`target/`** is Rust's build cache (gitignored). Safe to delete; recreated on next `cargo build`.
