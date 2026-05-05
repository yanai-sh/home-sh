# Contributing

Personal portfolio: outside contributions are not expected. This doc is for **you** (and future collaborators) shipping through **`main`**.

## Workflow (trunk)

1. **`git checkout main && git pull`** — start from current production history.
2. **`git checkout -b <topic>`** — short-lived branch (`feat/…`, `fix/…`, `chore/…`).
3. **`bun run verify`** before every push (matches CI on PRs and Deploy on `main`).
4. Open a **PR → `main`**. **Direct `git push origin main`** should fail under a strict ruleset—merge via PR after **CI / verify** is green.
5. **CHANGELOG:** maintain **`[Unreleased]`** by hand; cut dated sections when you tag (e.g. **`v2.0.1`**).

Branch protection: **`./scripts/gh-protect-main.sh`** (see [README](README.md)) or **Settings → Rules → Rulesets**.

## Commits

Use clear messages; **Conventional Commits** are optional but help reading history.

## Dependencies

- **Dependabot:** **`.github/dependabot.yml`** — monthly bumps for **Bun** + **GitHub Actions**. Turn off under **Settings → Code security and analysis** if you want fully manual updates only.
- **Security:** GitHub **Dependabot alerts** (if enabled) are separate from version PRs—review the Security tab periodically.

## Quality gates

| Command | Purpose |
|---------|---------|
| `bun run check` | Biome lint/format check on `src` and selected config |
| `bun run typecheck` | `astro check` (Astro + TypeScript diagnostics) |
| `bun run test` | `bun:test` for `src/**/*.test.ts` |
| `bun run build` | Production build to `dist/` |
| `bun run verify` | All of the above, in order |

Rationale: [ARCHITECTURE.md](ARCHITECTURE.md).

## Style

- **Biome** is the source of truth (`bun run fix` to auto-fix).
- Astro components: follow existing patterns under `src/components/`.
