# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **CI** runs on **pull requests to `main` only**; **Deploy** still runs **`verify`** on every **`push` to `main`**.
- **Tooling:** remove Renovate, PR template, Commitizen, commitlint, and git-cliff; **Lefthook** keeps **`pre-push` → `verify`** only; optional **monthly Dependabot** for Bun + GitHub Actions (`.github/dependabot.yml`).

## [2.0.0] - 2026-04-23

**Baseline:** **Astro 6** (SSR) on **Cloudflare Pages**, **Bun** + **Biome 2**, **CI** (verify on PRs to `main`) and **Deploy** (Node 22 for `astro check`, `wrangler pages deploy`). Trunk is **`main`** with **Lefthook** pre-push; dependency automation described in [ARCHITECTURE.md](ARCHITECTURE.md).

### Added

- **Lefthook** **`pre-push`** running **`bun run verify`** (mirrors CI).

### Changed

- **`prepare`:** skips **Lefthook** install when **`CI`** is set (CI runners do not need hooks).
