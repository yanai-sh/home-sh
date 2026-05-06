# Contributing

Personal portfolio: outside contributions are not expected. This doc is for **you** (and future collaborators) shipping through **`main`**.

## Workflow (dev → main)

Two long-lived branches, each backed by its own Cloudflare Worker. The same `apps/site/wrangler.jsonc` config is used for both — at upload time, the deploy workflow passes `--name yanai-sh-staging` to wrangler on `dev` pushes, redirecting the same code + bindings to a second Worker:

- **`dev`** — staging. Every push deploys to the **`yanai-sh-staging`** Worker. Independent ~10-version retention from prod, so dev iterations never burn prod rollback slots. Bindings (KV, Secrets Store, D1, rate limit) are sent verbatim from the shared config — staging and prod share state.
- **`main`** — production. Every push deploys to **`yanai-sh`** at 100% on `yanai.sh`.

The same Deploy workflow handles both — only the `--name` flag and the promote step branch on `github.ref`.

### Versioning

Auto-tagged in CI on every push:

- **dev push** → patch bump (`vX.Y.Z` → `vX.Y.Z+1`). Each dev iteration is addressable.
- **main push** → minor bump (`vX.Y.Z` → `vX.(Y+1).0`). Production releases stay on `vX.Y.0`.

Major bumps (`vX.0.0`) are intentional and remain manual: tag and push by hand when the change warrants it.

### Day-to-day

1. **`git checkout dev && git pull`** — start from staging history.
2. **`git checkout -b <topic>`** — short-lived branch (`feat/…`, `fix/…`, `chore/…`).
3. **`bun run verify`** before every push (matches CI on PRs and Deploy on `dev`/`main`).
4. Open a **PR → `dev`**. CI / verify gates the merge; once green and merged, Deploy uploads to **`yanai-sh-staging`** and auto-tags a patch bump. The run summary lists the preview URL.
5. QA the preview URL. When happy, open a **PR `dev` → `main`**. Merging promotes to 100% prod and auto-tags the next minor.
6. **CHANGELOG:** maintain **`[Unreleased]`** on `dev`; cut dated `[vX.Y.0]` sections in a chore-PR right before merging `dev` → `main`. Dev tags are throwaway markers — they don't get changelog entries.

Branch protection: **`./scripts/gh-protect-main.sh`** (see [README](README.md)) protects `main`. **Direct `git push origin main`** should fail under a strict ruleset — merge via PR after **CI / verify** is green. `dev` is intentionally less restricted (QA workflow benefits from fast-forward pushes during iteration).

## Releases

A production release is whatever lands on `main`. The Deploy workflow auto-tags the commit with the next minor (`vX.(Y+1).0`); you don't run `git tag` by hand.

1. **Update the changelog on `dev`** before opening the `dev` → `main` PR
   - Move `## [Unreleased]` content into a new `## [vX.(Y+1).0] - YYYY-MM-DD` section. (Predict the next minor — the workflow uses the same arithmetic.)
   - Leave a fresh empty `## [Unreleased]` block above it.
   - Commit on a chore branch off `dev`: `git commit -am "chore: changelog for vX.(Y+1).0"`, PR into `dev`, merge.

2. **PR `dev` → `main`** — merging triggers Deploy, which uploads + promotes the new prod version and auto-tags `vX.(Y+1).0`. No manual `git tag` step.

3. **For a major release** (breaking changes), bump the major manually after merge:
   ```sh
   git checkout main && git pull
   git tag -a vX+1.0.0 -m "vX+1.0.0"
   git push origin vX+1.0.0
   ```
   The Deploy workflow's auto-tag will compute its next bump off whatever tag exists, so a manual major tag becomes the new baseline.

4. **Verify deploy**
   ```sh
   gh run watch
   ```
   The Deploy workflow runs as part of the push to `main`. Wait for green.

5. **Production smoke**
   ```sh
   bun run --cwd apps/site smoke
   # uses SMOKE_BASE_URL=https://yanai.sh in CI; pass it locally:
   SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
   ```

   For local **`astro dev`** / **`preview`**, **`/resume`**, the home resume section, **`/workspace`**, and **`/resume.pdf`**, put the same **`RESUME_REPO_TOKEN`** PAT in **`apps/site/.dev.vars`** (Secrets Store-compatible value: **`resume_repo_token`** in **`infra/tofu/secrets.enc.json`**, deployed via **`bun run scripts/push-secrets.ts`**). Needs **Contents read** on **`yanai-sh/resume`** (private repo API + Releases). Without it the console warns in dev and the site falls back to **`content/resume.generated.json`** from the last **`sync:resume`**.

   Root **`bun run sync:resume`** (via **`bun run build`** / **`verify`**) also honors **`RESUME_REPO_TOKEN`** when **`GITHUB_TOKEN`** / **`RESUME_GITHUB_TOKEN`** are unset, so **`direnv`** decrypting SOPS can refresh **`resume.generated.json`** with the same PAT as production.

   For **`/resume.pdf`** smoke only: if **`RESUME_REPO_TOKEN`** is unset locally, that test is skipped unless **`SMOKE_BASE_URL`** hits an origin where the Worker already has the binding.

5. **Annotate the version on Cloudflare**
   The CI deploy includes the commit SHA in the `--tag` flag, so the dashboard shows the SHA next to each version. No manual annotation needed.

6. **If anything fails**, follow the rollback procedure in `ARCHITECTURE.md`.

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
