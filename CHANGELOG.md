# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Runtime migrated** from **Cloudflare Pages** to **Cloudflare Workers with Static Assets** per the `@astrojs/cloudflare` v13 default output. Deploy command in CI is now **`wrangler deploy`** (project-pinned wrangler 4.x) against `apps/site/dist/server/wrangler.json`. Custom domain `yanai.sh` bound via Workers Custom Domain (Tofu-managed).
- **Contact handler consolidated** into the site Worker as an Astro API route at **`/api/contact`** (replaces the standalone `yanai-sh-contact` Worker). Single ingress for `yanai.sh`; removes the per-route IAM scope and one deploy artifact.
- **OpenTofu provider bumped** **`cloudflare/cloudflare ~> 4.0` → `~> 5.0`**. State migrated for D1, KV, Turnstile (state rm + re-import). New `cloudflare_workers_custom_domain.yanai_sh` resource declares the apex binding. Worker script content stays a CI/CD artifact, not Tofu-managed.
- **Project secrets** moved into a SOPS-encrypted file at `infra/tofu/secrets.enc.json`, decrypted by Tofu via `carlpett/sops` and exposed locally via direnv (`.envrc`).
- **CI** runs on **pull requests to `main` only**; **Deploy** still runs **`verify`** on every **`push` to `main`**.
- **Tooling:** remove Renovate, PR template, Commitizen, commitlint, and git-cliff; **Lefthook** keeps **`pre-push` → `verify`** only; optional **monthly Dependabot** for Bun + GitHub Actions (`.github/dependabot.yml`).

## [2.0.0] - 2026-04-23

**Baseline:** **Astro 6** (SSR) on **Cloudflare Pages**, **Bun** + **Biome 2**, **CI** (verify on PRs to `main`) and **Deploy** (Node 22 for `astro check`, `wrangler pages deploy`). Trunk is **`main`** with **Lefthook** pre-push; dependency automation described in [ARCHITECTURE.md](ARCHITECTURE.md).

### Added

- **Lefthook** **`pre-push`** running **`bun run verify`** (mirrors CI).

### Changed

- **`prepare`:** skips **Lefthook** install when **`CI`** is set (CI runners do not need hooks).
