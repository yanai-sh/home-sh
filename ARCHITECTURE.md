# Architecture

Short rationale for choices a reviewer or interviewer might ask about. (Drafting may use AI; **ownership and tradeoffs are yours to defend.**)

## Platform

| Decision | Rationale |
|----------|-----------|
| **Astro 6 + `output: 'server'`** | HTML-first components, SSR where we read `Request` / Cloudflare metadata for the footer trace line. |
| **Cloudflare Workers with Static Assets + `@astrojs/cloudflare` v13** | Edge SSR Worker serving its own static `client/` assets via the `ASSETS` binding. One vendor for DNS + TLS + compute; **`astro preview`** (workerd) exercises the built artifact; deploy uses **`wrangler deploy`** against `apps/site/dist/server/wrangler.json`. Cloudflare deprecated the Pages-Functions output path for new SSR apps in 2024–2025; the v13 adapter emits the Workers-shape bundle by default. |
| **Bun** | Fast install/run, native TS, aligns with modern tooling; CI pins a minor line via `packageManager` + `engines`. |
| **Monaspace** ([githubnext/monaspace](https://github.com/githubnext/monaspace)) | UI font (Neon on `body`); served from `@fontsource/monaspace-*` npm packages imported in `Layout.astro`. |

## Security & headers

| Decision | Rationale |
|----------|-----------|
| **Middleware sets CSP, HSTS, etc.** | Central place for response headers; Monaspace from jsDelivr is allowlisted explicitly. |
| **CSP** | `style-src` keeps `'unsafe-inline'` for token injection in `Layout`; `script-src 'self'` with bundled client modules (`vite.build.assetsInlineLimit: 0` so Astro does not inline scripts in the Pages manifest). |

## Delivery

| Decision | Rationale |
|----------|-----------|
| **Protected `main` + PRs from topic branches** | Trunk flow: topic branch → PR → **`main`**. **CI:** **`pull_request`** to **`main`** only (`.github/workflows/ci.yml`). **`push`** to **`main`** does not re-run CI—**Deploy** already runs **`verify`** on that path. |
| **Deploy workflow runs `bun run verify` before upload** | Same **`verify`** as PR CI; the Pages artifact is never uploaded without a full gate. |
| **No `release-please` in-repo** | PAT/rules friction on strict **`main`**; tags + hand-edited **`CHANGELOG.md`** are enough at this size. |
| **Dependabot (monthly) instead of Renovate** | Native GitHub: **`.github/dependabot.yml`** for **`bun`** + **`github-actions`**, **monthly** schedule—low noise for a solo repo. **Disable** Dependabot in repo settings if you prefer fully manual bumps. |

## Quality

| Decision | Rationale |
|----------|-----------|
| **Biome + `astro check` + `bun test`** | Lint/format, Astro diagnostics, and a small regression net for edge helpers—proportionate for a portfolio site. |
| **Lefthook `pre-push` → `verify`** | Mirrors PR CI before **`git push`**; no **`commit-msg`** hook—Conventional Commits are optional discipline, not linted. |
| **CI/deploy call `bun run verify` once** | Same command as local and `package.json`; avoids drift where CI runs a subset of scripts in a different order. |
| **`setup-bun` without a hard-coded version** | The action reads **`packageManager`** / **`engines.bun`** from `package.json`—one source of truth with Corepack-style pinning. |

## Toolchain (what we use and what we skip)

| Tool | Role | Why not something else |
|------|------|-------------------------|
| **Bun** | Install, scripts, unit tests (`bun:test`) | Node is fine but adds a second runtime story; Vitest/Jest are heavier for a handful of edge-helper tests. |
| **Biome** | Lint + format for JS/TS/config | ESLint + Prettier = two configs, slower; Biome is one fast formatter/linter. Astro templates still rely on **`astro check`** for template/types. |
| **`@astrojs/check` + `astro check`** | `.astro` + TS diagnostics | Biome’s Astro story is intentionally limited here (see `biome.json` overrides); official check is the right layer. |
| **TypeScript (strict) + `@astrojs/ts-plugin`** | Types + editor IntelliSense in `.astro` | No `vue-tsc`-style alternative for Astro; plugin is editor-focused, not runtime. |
| **Wrangler 4.x (project-pinned)** | `wrangler deploy` from CI + local `wrangler dev` | The `cloudflare/wrangler-action` ships wrangler 3.x which rejects v13-adapter output (top-level `triggers`, `ai_search` bindings, etc.). CI runs `bun run --cwd apps/site deploy` against the project-pinned 4.x. |
| **Dependabot** | Monthly PRs for **`bun`** + **GitHub Actions** | No third-party app; weaker than Renovate for grouping/rules—acceptable for one maintainer. |
| **Lefthook** | **`pre-push`** → **`verify`** only | **pre-commit** (framework) would add a Python runtime; Husky is fine but Lefthook stays one YAML + Bun-native **`prepare`**. |
| **No Commitizen / commitlint / git-cliff** | Plain **`git commit`**; **`CHANGELOG`** by hand | Solo repo: generated changelogs and message lint were more ceremony than signal. |

**Skipped on purpose (not “missing”):** ESLint/Prettier, Husky, `npm`/`pnpm`, Vitest for this scope, **`release-please`** (PAT friction), **Renovate** (third-party app; **Dependabot** covers “occasional bump PRs”), **PR templates** (no external contributors), Knip/size-limit—more ceremony than signal at this size.

## Git workflow (local vs remote)

| Situation | What to do |
|-----------|------------|
| **Before M0 alpha candidate** | A missing `origin` is intentional. Keep work local until `bun run verify` and the manual alpha deployment smoke test pass. |
| **Alpha candidate accepted** | Set `origin` to **`yanai-sh/home-sh`**, push the branch/tag, then ensure the Deploy workflow secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`) are set on the repo so `wrangler deploy` can publish. |
| **`main` push rejected** | Expected when rulesets require PRs. Push a **topic branch**, open **PR → `main`**, merge when **CI / verify** is green. |
| **Local `main` ahead of `origin/main`** | Usually means unpushed merges or local commits—publish via PR; avoid **`git push origin main`** if rulesets forbid it. |
| **CI badge** | README tracks **`main`** (same branch as deploy). |
