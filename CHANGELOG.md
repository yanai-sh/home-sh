# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-05-06

### Added

- **Workers Secrets Store** as the source-of-binding for runtime secrets (`TURNSTILE_SECRET`, `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`). Account-level store `yanai-sh-prod` bound to the site Worker via `secrets_store_secrets` in `apps/site/wrangler.jsonc`; values pushed from SOPS by `bun run scripts/push-secrets.ts` (or `just push-secrets`).
- **Contact endpoint hardening** — server-side honeypot (`website` field, silent 200 on bot fill), Cloudflare Workers Rate Limiting binding (`CONTACT_RATE_LIMIT`, 5 requests / IP / minute), stable error-code module at `apps/site/src/lib/contact-error-codes.ts` mapped to user-friendly strings client-side, and `console.error` of Resend rejection bodies for observability.
- **Astro content collection** for the resume snapshot — Zod schema at `apps/site/src/content/resume-schema.ts` is the single source of truth; both `/resume` and the homepage `ResumeShowcase` consume `getEntry('resume', 'current')`. Sync helpers extracted into `scripts/lib/sync-resume-normalize.ts` with unit tests.
- **Build-time `resume.pdf`** via headless Playwright printing the SSR'd `/resume` route at deploy time (`scripts/generate-resume-pdf.ts`); CI generates it after `verify` and before Worker upload. Drops the checked-in stale `apps/site/public/resume.pdf`.
- **First-viewport resume CTAs** in `Lede.astro` (`View resume` / `Download PDF`) — readable without WASM/JS.
- **Playwright smoke suite** at `apps/site/tests/smoke/landing.spec.ts` covering CTAs, `/resume`, `/resume.pdf`, `/workspace`, 404, reduced-motion, contact form sitekey, and mobile viewport.
- **Versioned Worker deploys** — CI runs `wrangler versions upload` then `versions deploy <id>@100%`, tagging each version with the commit SHA.
- **Manual rollback workflow** (`.github/workflows/rollback.yml`) — `workflow_dispatch` accepts a target version id, promotes it to 100%, and smoke-checks `/` and `/resume`.
- **Monthly token-expiry probe** (`.github/workflows/token-expiry-check.yml`) — opens a GitHub issue when the Cloudflare API token has ≤30 days remaining; gracefully no-ops when the `User Details: Read` scope is missing.
- **Documented release + rollback procedures** in `ARCHITECTURE.md` (Worker rollback paths, adjacent failure modes) and `CONTRIBUTING.md` (changelog → tag → push → smoke checklist).
- **Branch protection ruleset** on `main` — PRs required, CI/`verify` status check gates merges, no force-push.

### Changed

- **Runtime migrated** from **Cloudflare Pages** to **Cloudflare Workers with Static Assets** per the `@astrojs/cloudflare` v13 default output. Deploy command in CI is now **`wrangler deploy`** (project-pinned wrangler 4.x) against `apps/site/dist/server/wrangler.json`. Custom domain `yanai.sh` bound via Workers Custom Domain (Tofu-managed).
- **Contact handler consolidated** into the site Worker as an Astro API route at **`/api/contact`** (replaces the standalone `yanai-sh-contact` Worker). Single ingress for `yanai.sh`; removes the per-route IAM scope and one deploy artifact.
- **OpenTofu provider bumped** **`cloudflare/cloudflare ~> 4.0` → `~> 5.0`**. State migrated for D1, KV, Turnstile (state rm + re-import). New `cloudflare_workers_custom_domain.yanai_sh` resource declares the apex binding. Worker script content stays a CI/CD artifact, not Tofu-managed.
- **Project secrets** moved into a SOPS-encrypted file at `infra/tofu/secrets.enc.json`, decrypted by Tofu via `carlpett/sops` and exposed locally via direnv (`.envrc`).
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
