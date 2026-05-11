# Project context

**Read [AGENTS.md](AGENTS.md) first** for architecture, layout, and full command list. [ARCHITECTURE.md](ARCHITECTURE.md) covers design rationale.

## Cold-start essentials

- **Bun monorepo** — Astro 6 SSR as a Cloudflare Worker with Static Assets + Rust/WASM (`apps/wasm/*`); `/api/contact`, `/api/telemetry/*`, **`/resume`/home resume** (pinned **`resume/`** git submodule → `sync:resume` → `resume.generated.json`), and **`/resume.pdf`** (Release proxy; **`RESUME_REPO_TOKEN`** for private **`yanai-sh/resume`** releases) on the site Worker (`DB` = D1 telemetry).
- **Bun only** — `bun install`, `bun run`, `bun test`, `bunx`. No npm/yarn/pnpm. `.env` auto-loaded.
- **Verify before claiming done:** `bun run verify` (= check → typecheck → test → build; mirrors CI). **`bun run smoke`** — Playwright smoke (`apps/site`).
- **Polyglot tasks:** `just --list` (WASM, Workers, OpenTofu). Infra: **[infra/README.md](infra/README.md)**.
- **CSS:** Panda CSS preset in `packages/ui-system` *and* `src/design/tokens.ts` → `:root` vars in `Layout.astro`. `dev`/`build` run `panda codegen` first.
- **Path aliases** (`apps/site/tsconfig.json`; Vite mirrors `@resume/generated` in `astro.config.mjs`): `@/`, `@components/*`, `@layouts/*`, `@lib/*`, `@config/*`, `@resume/generated` → `content/resume.generated.json`.
- **direnv** (`.envrc`): **`direnv allow`** → **`GIT_CONFIG_*`** scopes **Git** to **`yanai-sh`** on GitHub; **`GH_TOKEN`** from **`gh auth token -u yanai-sh`** when available. Cleared outside this repo. Restore default **`gh`** account elsewhere with **`gh auth switch -u <account>`**.
- **Client scripts:** `*-client.ts` naming, loaded as `<script>` tags — never build-time imports.
- **Lefthook `pre-push`** runs `verify`. Skip with `LEFTHOOK=0` (rare).
