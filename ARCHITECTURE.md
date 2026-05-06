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
| **Deploy workflow runs `bun run verify` before upload** | Same **`verify`** as PR CI; the Worker version is never uploaded without a full gate. |
| **Versioned deploys (`wrangler versions upload` + `versions deploy @100%`)** | Each push uploads an immutable Worker version (0% traffic), then promotes it. Decouples build from rollout — instant rollback via **`.github/workflows/rollback.yml`** without rebuilding. Cloudflare retains ~10 versions for rollback eligibility. |
| **Concurrency: Deploy + Rollback queue (`cancel-in-progress: false`); CI cancels (`true`)** | Production deploys preserve atomicity per commit — every push to `main` lands its own Worker version, even when a faster push follows (rollback granularity, audit trail). Rollback shares the deploy group so neither can race the other. PR CI cancels stale runs because newer pushes obsolete older test runs by definition. |
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

## Rollback

Each `wrangler deploy` creates an immutable Worker version. The current production deployment is one of those versions held at 100%; older versions remain accessible until Cloudflare's ~10-version retention rolls them off. Rolling back is a version-pointer change, not a rebuild.

### Find a known-good version id

```sh
bun run --cwd apps/site exec wrangler versions list --config dist/server/wrangler.json
```

Or via Cloudflare Dashboard → Workers & Pages → `yanai-sh` → Deployments tab. Each row shows the version id, message (commit subject from CI), and tag (short SHA).

### Roll back via the GitHub Actions workflow

GitHub → Actions → **Rollback Worker** → Run workflow → enter the version id and an optional reason. The workflow promotes the target version to 100% and runs a smoke check against `/` and `/resume`.

### Roll back from the local CLI (if Actions is unavailable)

```sh
eval "$(SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt sops --decrypt --input-type json --output-type json infra/tofu/secrets.enc.json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value)"')"
bun run --cwd apps/site build
bun run --cwd apps/site exec wrangler versions deploy "<version-id>@100%" \
  --config dist/server/wrangler.json --message "manual rollback" --yes
```

### Failure modes that rollback does not solve

- **D1 schema regression** — D1 migrations are forward-only. To recover, write a fix-forward migration; never mutate the in-place schema.
- **KV namespace data corruption** — restore from a prior backup (manual). KV has no point-in-time recovery on the free tier.
- **Custom Domain detachment** — re-bind via `cloudflare_workers_custom_domain.yanai_sh` in Tofu (`tofu apply`), or via the Cloudflare API.
- **Secrets rotation gone wrong** — revert the SOPS commit and re-apply Tofu / re-`wrangler secret put` the prior value.
