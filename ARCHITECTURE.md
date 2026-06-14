# Architecture

Short rationale for choices a reviewer or interviewer might ask about. (Drafting may use AI; **ownership and tradeoffs are yours to defend.**)

## Platform

| Decision                                                                        | Rationale                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SvelteKit 5 + `@sveltejs/adapter-cloudflare`**                              | Edge SSR Worker serving static assets via the `ASSETS` binding. File-based routes (`+page`, `+layout`, `+server`); **`hooks.server.ts`** for security headers. Deploy uses **`wrangler versions upload --config apps/site/wrangler.jsonc`** (Worker + client in **`.svelte-kit/cloudflare/`**). |
| **Splash WebGL field**                                                        | Visible demo: **`field-gl.ts`** curl-noise chrome (theme/split/contact uniforms). **`POST /api/contact`** input validation, Turnstile, Resend, and rate limits all stay in TypeScript (`lib/server/contact.ts`) — deliberately simple over a Wasm validator that earned nothing for a three-field form. |
| **Vite 8 + svelte-check**                                                       | Site build and typecheck; Velite for content collections at build time.                                                                                                                                                                                                   |
| **pnpm + Node 22**                                                              | Package manager and runtime; CI uses **`pnpm-install`** composite.                                                                                                                                                                                                   |
| **Monaspace** ([githubnext/monaspace](https://github.com/githubnext/monaspace)) | UI font; served from `@fontsource/*` in `global.css`.                                                                                                                                                                                                                |

## Security & headers

| Decision                            | Rationale                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Middleware sets CSP, HSTS, etc.** | Central place for response headers; Monaspace from jsDelivr is allowlisted explicitly.                                                       |
| **CSP**                             | `style-src` keeps `'unsafe-inline'`; `script-src 'self'` with bundled client modules (`vite.build.assetsInlineLimit: 0`). |

## Delivery

| Decision                                                                                    | Rationale                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Protected `main` + PRs from topic branches**                                              | Trunk flow: topic branch → PR → **`main`**. **CI:** **`pull_request`** to **`main`** only (`.github/workflows/ci.yml`). **`push`** to **`main`** does not re-run CI—**Deploy** already runs **`verify`** on that path.                                                                                                           |
| **Deploy workflow runs `pnpm run verify` before upload**                                    | Same **`verify`** as PR CI; the Worker version is never uploaded without a full gate.                                                                                                                                                                                                                                            |
| **`/resume.pdf` on-request from GitHub Releases**                                           | **`GET /resume.pdf`** lists **`yanai-sh/resume`**’s latest release, finds **`YanaiKlugman_CV_*.pdf`**, and streams it with a PAT from **Secrets Store** (`RESUME_REPO_TOKEN`). No static asset in `dist/client/`.                                                                                                                |
| **Versioned deploys (`wrangler versions upload` + `versions deploy @100%`)**                | Each push uploads an immutable Worker version (0% traffic), then promotes it. Decouples build from rollout — instant rollback via **`.github/workflows/rollback.yml`** without rebuilding. Cloudflare retains ~10 versions for rollback eligibility.                                                                             |
| **Concurrency: Deploy + Rollback queue (`cancel-in-progress: false`); CI cancels (`true`)** | Production deploys preserve atomicity per commit — every push to `main` lands its own Worker version, even when a faster push follows (rollback granularity, audit trail). Rollback shares the deploy group so neither can race the other. PR CI cancels stale runs because newer pushes obsolete older test runs by definition. |
| **No `release-please` in-repo**                                                             | PAT/rules friction on strict **`main`**; tags + hand-edited **`CHANGELOG.md`** are enough at this size.                                                                                                                                                                                                                          |
| **Dependabot (monthly) instead of Renovate**                                                | Native GitHub: **`.github/dependabot.yml`** for **npm** + **GitHub Actions**, **monthly** schedule.                                                                                                                                                                                                                              |

## Quality

| Decision                                  | Rationale                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| **Vite+ + Vitest + Oxlint/Oxfmt**         | Lint/format, typecheck (tsgo), and unit tests—proportionate for a portfolio site. |
| **Lefthook `pre-push` → `verify`**        | Mirrors PR CI before **`git push`**.                                              |
| **CI/deploy call `pnpm run verify` once** | Same command as local and `package.json`.                                         |
| **`setup-node` + `pnpm/action-setup`**    | Node from **`.node-version`**; pnpm from **`packageManager`**.                    |

## Toolchain (what we use and what we skip)

| Tool                                       | Role                                            | Why not something else                                                           |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| **Vite+ (`vp`)**                           | dev, check, build                               | Replaces Bun + Biome + astro check                                               |
| **Vitest**                                 | Unit/handler tests                              | `vitest.config.ts` avoids loading workerd in tests                               |
| **tsgo (via `vp check`)**                  | TypeScript diagnostics                          | Replaces `@astrojs/check`                                                        |
| **SvelteKit + Velite**                     | SSR + content                                   | File-based routes; Velite MDX/JSON at build time                                 |
| **Wrangler 4.x (project-pinned)**          | `wrangler versions upload/deploy`               | Config: **`apps/site/wrangler.jsonc`**; build output: **`.svelte-kit/cloudflare/`** |
| **Dependabot**                             | Monthly PRs for **npm** + **GitHub Actions**    | No third-party app                                                               |
| **Lefthook**                               | **`pre-push`** → **`verify`** only              | **`pnpm exec lefthook install`** on **`prepare`**                                |
| **No Commitizen / commitlint / git-cliff** | Plain **`git commit`**; **`CHANGELOG`** by hand | Solo repo: generated changelogs and message lint were more ceremony than signal. |

**Skipped on purpose (not “missing”):** ESLint/Prettier, Husky, npm (use **pnpm** only), **`release-please`** (PAT friction), **Renovate** (third-party app; **Dependabot** covers “occasional bump PRs”), **PR templates** (no external contributors), Knip/size-limit—more ceremony than signal at this size.

## Git workflow (local vs remote)

| Situation                               | What to do                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Before M0 alpha candidate**           | A missing `origin` is intentional. Keep work local until `pnpm run verify` and the manual alpha deployment smoke test pass.                                                                                                                                              |
| **Alpha candidate accepted**            | Set `origin` to **`yanai-sh/home-sh`**, push the branch/tag, then ensure the Deploy workflow secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`) are set on the repo so pushes to **`dev`** / **`main`** can upload Workers versions. |
| **`main` push rejected**                | Expected when rulesets require PRs. Push a **topic branch**, open **PR → `main`**, merge when both required checks **`yanai-sh / verify (ubuntu-latest) / yanai-sh / verify — run`** and **`yanai-sh / verify (macos-latest) / yanai-sh / verify — run`** are green.     |
| **Local `main` ahead of `origin/main`** | Usually means unpushed merges or local commits—publish via PR; avoid **`git push origin main`** if rulesets forbid it.                                                                                                                                                   |
| **CI badge**                            | README tracks **`main`** (same branch as deploy).                                                                                                                                                                                                                        |

## Rollback

Each `wrangler deploy` creates an immutable Worker version. The current production deployment is one of those versions held at 100%; older versions remain accessible until Cloudflare's ~10-version retention rolls them off. Rolling back is a version-pointer change, not a rebuild.

### Find a known-good version id

```sh
pnpm --dir apps/site exec wrangler versions list --config wrangler.jsonc
```

Or via Cloudflare Dashboard → Workers & Pages → `yanai-sh` → Deployments tab. Each row shows the version id, message (commit subject from CI), and tag (short SHA).

### Roll back via the GitHub Actions workflow

GitHub → Actions → **`yanai-sh / Rollback`** → Run workflow → enter the version id and an optional reason. The workflow promotes the target version to 100% and runs a smoke check against `/` and `/resume`.

### Roll back from the local CLI (if Actions is unavailable)

```sh
# Ensure CLOUDFLARE_* and any needed bindings are in the environment (direnv + worker-secrets.local.json, or copy from terraform.tfvars / dashboard).
pnpm run build
pnpm --dir apps/site exec wrangler versions deploy "<version-id>@100%" \
  --config wrangler.jsonc --message "manual rollback" --yes
```

### Failure modes that rollback does not solve

- **D1 schema regression** — D1 migrations are forward-only. To recover, write a fix-forward migration; never mutate the in-place schema.
- **KV namespace data corruption** — restore from a prior backup (manual). KV has no point-in-time recovery on the free tier.
- **Custom Domain detachment** — re-bind via `cloudflare_workers_custom_domain.yanai_sh` in Tofu (`tofu apply`), or via the Cloudflare API.
- **Secrets rotation gone wrong** — restore GitHub **Environment** secrets (`staging`/`production`) + gitignored **`infra/secrets/worker-secrets.local.json`** / **`.dev.vars`**, re-run **`yanai-sh / Secrets — push`** (or `pnpm run push-secrets`), and restore **`infra/tofu/terraform.tfvars`** + **`CLOUDFLARE_API_TOKEN`** if the API token rotated; then re-apply Tofu as needed.
