# Project context

**Read [AGENTS.md](AGENTS.md) first** for architecture, layout, and full command list. [ARCHITECTURE.md](ARCHITECTURE.md) covers design rationale.

## Cold-start essentials

- **Bun monorepo** — Astro 6 SSR as a Cloudflare Worker with Static Assets + Rust/WASM (`apps/wasm/*`) + standalone Cloudflare Workers (`infra/workers/*`).
- **Bun only** — `bun install`, `bun run`, `bun test`, `bunx`. No npm/yarn/pnpm. `.env` auto-loaded.
- **Verify before claiming done:** `bun run verify` (= check → typecheck → test → build; mirrors CI).
- **Polyglot tasks:** `just --list` (WASM, Workers, OpenTofu).
- **CSS:** Panda CSS preset in `packages/ui-system` *and* `src/design/tokens.ts` → `:root` vars in `Layout.astro`. `dev`/`build` run `panda codegen` first.
- **Path aliases** (`apps/site/tsconfig.json`): `@/`, `@components/*`, `@layouts/*`, `@lib/*`, `@config/*`.
- **Client scripts:** `*-client.ts` naming, loaded as `<script>` tags — never build-time imports.
- **Lefthook `pre-push`** runs `verify`. Skip with `LEFTHOOK=0` (rare).
