# Roadmap

Status date: 2026-05-11

This is the planning source of truth for `yanai.sh`. It consolidates the old
split design and execution notes into one document. `ARCHITECTURE.md` records
durable technical tradeoffs. `CHANGELOG.md` records shipped changes. This file
records product direction, design intent, milestones, and acceptance gates.

## Product Direction

`yanai.sh` should open with a technical first impression, then make the resume
path impossible to miss.

The first viewport should be a progressive **WASM-backed experience** when the
browser supports it. The server-rendered baseline should be a **static resume
fallback** with visible `View resume` and `Download resume` actions before any
client script runs.

The site has one **primary** surface and supporting routes:

| Route | Role |
| --- | --- |
| `/` | **Primary experience:** progressive landing (SSR resume summary first, lazy WASM/canvas/search/telemetry in-page). Same-document anchors: `#hero`, `#resume` (summary band), `#resume-full` (full semantic resume), `#systems`, `#contact`. |
| `/resume` | Optional deep link / print: same snapshot as `#resume-full`, standalone layout, no WASM required. |
| `/resume.pdf` | LaTeX-built PDF from **`yanai-sh/resume`** releases, proxied at request time (not a repo static file). |
| `/workspace` | **Legacy redirect** → `/#systems` (308). Do not add new behavior here. |

The practical user flow is simple: see the technical signal on `/`, scroll or
follow in-page anchors for the full resume and systems strip, and download the
PDF without leaving the primary document. **`/workspace` is legacy:** HTTP
redirect to `/#systems` (no unique product surface).

## Design Intent

The site should feel like a systems tool, not a portfolio template.

Principles:

- **Progressive spectacle.** The first impression can be visual and technical,
  but it must enhance real server-rendered content.
- **Information density.** Favor compact, scannable layouts over large soft
  cards and oversized marketing sections.
- **Visible structure.** Use grids, 1px borders, metadata labels, counters, and
  trace lines as part of the visual language.
- **Systems transparency.** Build hashes, resume source freshness, sync status,
  and telemetry can be visible content when they help the story.
- **Graceful degradation.** WASM, JavaScript, canvas, motion, and contact
  delivery can fail without blocking resume access.

Visual rules:

- Base background: off-black.
- Foreground: high-contrast near-white.
- Accent: restrained blue for primary actions and active states.
- Data/warning: muted amber for provenance and status.
- Grid unit: 4px.
- Borders: strict 1px.
- Typography: monospace for body/data; serif only where an established heading
  treatment calls for it.
- Avoid gradients on surfaces, drop shadows, rounded card piles, icon fonts,
  emoji UI chrome, and template-style skill-chip overload.

Interaction rules:

- `/` may use WASM and canvas only as a lazy enhancement; the **`#systems`**
  strip may host search, canvas preview, and aggregate telemetry UI with list
  view and reduced-motion fallbacks (same requirements formerly scoped to
  `/workspace`).
- `/resume` must be semantic HTML with normal vertical scroll.
- Never hijack vertical wheel scrolling for horizontal navigation.
- Never trap keyboard focus without an obvious `Esc` path and visible close
  control.

## Architecture Intent

The current thesis is a hybrid delivery model:

- Astro serves durable HTML first.
- Rust/WASM handles bounded, high-value visual/search workloads.
- A Cloudflare Worker (Workers with Static Assets) serves the site.
- Cloudflare Workers handle contact and telemetry.
- D1 stores coarse aggregate telemetry.
- Structured resume content feeds HTML surfaces from a **pinned git submodule**
  plus build artifacts; the PDF path uses **GitHub Releases** separately.

Boundary decisions:

- Prefer a non-SharedArrayBuffer WASM scene on `/`.
- Keep COOP/COEP off `/` unless the homepage **`#systems`** design explicitly
  requires shared memory (SharedArrayBuffer). While **`/workspace`** existed,
  headers were scoped there; after redirect removal, only widen COOP/CEOP to `/`
  behind an explicit decision + CSP/CORP audit.
- Do not put heavy interactive code on `/resume`.
- Do not add frontend frameworks inside WASM islands.
- D1 migrations are forward-only.
- Secrets live in Cloudflare or local env, never in repo files.

## Current Baseline

Shipped foundation:

- Astro 6 SSR site under `apps/site`, deployed as a Cloudflare Worker (Workers with Static Assets) via `wrangler deploy`.
- Bun monorepo with `apps/site` and `packages/ui-system`.
- Design tokens emitted from `src/design/tokens.ts` through `buildRootCss()`.
- Panda config and UI recipes under `packages/ui-system`.
- Rust/WASM packages for shared bridge state, canvas rendering, and fuzzy search.
- Contact Worker scaffold with Turnstile verification and Resend delivery.
- Telemetry read/write Workers backed by the first D1 migration.
- Security middleware with CSP, HSTS on HTTPS, and COOP/COEP scoped to
  `/workspace`.
- Local quality gate: `bun run verify`.

Near-term gaps, in priority order:

- **`/` progressive contract** — SSR resume block is solid; keep WASM/canvas as
  lazy enhancement with strict size and motion budgets.
- **Brand / path consistency** — README, OG assets, and public routes occasionally
  drift; periodic pass.
- **Preview and smoke** — extend Playwright beyond landing + workspace where ROI
  is clear (telemetry slots, DNT paths).
- **Contact** — prod-only origin by design; document and keep Turnstile + Resend
  + rate limit monitored.
- **`#systems` on `/`** — search, canvas/WASM preview, telemetry readout, and
  reduced-motion / list-view fallbacks (interactive milestone on the home
  document).
- **Telemetry** — coarse aggregates shipped; tune retention and copy in-pane as
  usage grows.

## Operating Rules

- Keep `main` deployable. Land incomplete work behind an unrouted page, a static
  placeholder, or a feature flag.
- Use Bun commands from the repository root unless a package script requires a
  package directory.
- Extend existing tokens and recipes before adding one-off component colors.
- Keep the `/` fallback server-rendered and usable with no WASM.
- Keep `View resume` and `Download resume` visible in both enhanced and fallback
  homepage modes.
- Treat D1 migrations as forward-only.
- Run `bun run verify` before merge-sized commits. For docs-only changes,
  `git diff --check` is enough unless the docs change commands or config.

## Content Pipeline

Resume **HTML** (home band, `/resume`, `/#systems` search index input) comes
from the canonical upstream repo as a **git submodule** at `resume/` →
`yanai-sh/resume` on a **pinned commit**.

Build-time flow:

```text
resume/resume.toml (submodule pin)
  -> bun run sync:resume (scripts/sync-resume.ts)
  -> normalizeToml + Zod (ResumeSnapshotSchema)
  -> content/resume.generated.json   # bundled SSR + client search
  -> content/resume.snapshot.json      # redacted-source test fixture
  -> /, /resume, /#systems search
```

**`/resume.pdf`** is **not** the same artifact path: the Worker proxies the
latest **`yanai-sh/resume`** GitHub **Release** asset matching
`YanaiKlugman_CV_*.pdf`, using **`RESUME_REPO_TOKEN`**. HTML and PDF can
therefore differ until a release is cut for a given TOML revision — that is an
explicit product choice.

Rules:

- **`git submodule update --init --recursive`** is required on clone and in CI
  (`submodules: recursive` on checkout). **`bun run verify`** runs
  **`sync:resume`** first; a missing submodule fails the build (no silent stale
  HTML). For a **private** `yanai-sh/resume`, CI/deploy/rollback checkouts pass
  **`token: ${{ secrets.RESUME_REPO_TOKEN }}`** so the runner can clone the
  submodule (same PAT as **`push-secrets`** / Worker **`RESUME_REPO_TOKEN`**).
- The upstream repo is Rust/TOML/Tectonic. Consume **`resume.toml`** at the repo
  root; do not infer JSON Resume unless upstream changes format.
- One **normalized** schema (`home-sh-resume-v1`) before any Astro render or
  bundle import.
- Local site copy (e.g. **`HOME_RESUME_SECTION_DECK`**) may supplement layout
  copy; avoid duplicating resume **facts** outside `resume.toml`.

## Route Model

### `/`

Server-render:

- name and role
- compact resume summary
- latest or strongest proof points
- primary **`View resume`** → in-page target **`#resume-full`** (same URL)
- **`Download resume`** → `/resume.pdf` (new tab or attachment semantics
  acceptable; primary document stays `/`)
- optional secondary link to **`/resume`** for print / crawlers
- full semantic resume region **`#resume-full`** (same snapshot as `/resume`)
- **`#systems`** shell for lazy WASM search/canvas/telemetry (progressive)
- no broken empty state if scripts fail

Enhance when supported:

- WASM/canvas visual scene
- visible technical status labels
- subtle motion tied to pointer/scroll/device capabilities
- fallback preserved in DOM

Acceptance:

- First viewport contains primary resume actions (`View resume` → `#resume-full`,
  `Download resume` → PDF) without requiring navigation to `/resume`.
- No-WASM, no-JS, reduced-motion, and mobile modes stay useful.
- The enhancement lazy-loads and has a size budget.
- Resume actions remain keyboard reachable.

### `/resume`

Purpose:

- canonical readable HTML resume
- semantic structure for recruiters, screen readers, print, and search

Layout direction:

- Desktop: compact identity/provenance rail plus main chronological content.
- Mobile: single column with anchor navigation.
- Sections: summary, experience, projects/evidence, skills, education, links.
- Provenance: submodule URL at pinned SHA (from `resume.generated.json`), or
  redacted “fallback snapshot” when using the stripped test fixture only.

Acceptance:

- Works without JavaScript.
- Prints cleanly.
- Uses the same normalized resume source as the homepage HTML band; PDF
  remains the Release proxy described above.
- Avoids decorative template chrome.

### `/resume.pdf`

Purpose:

- recruiter/ATS artifact
- stable download target for buttons and signatures

Acceptance:

- Sourced from **`yanai-sh/resume`** latest release asset (**`YanaiKlugman_CV_*.pdf`**), fetched by the site Worker (no committed or build-bundled PDF).
- Opens cleanly in common PDF viewers.

### `/workspace` (legacy)

Purpose:

- **HTTP 308** to `/#systems` so old links keep working.

Acceptance:

- **`GET /workspace`** and **`GET /workspace/*`** redirect to the home URL with
  fragment **`#systems`** (exact hash policy documented in middleware or page).
- No standalone interactive document is required at `/workspace` once redirect
  ships.
- **COOP/COEP:** **`apps/site/public/_headers`** no longer scopes isolation to
  `/workspace/*` (redirect-only route). Any future SharedArrayBuffer need on `/`
  requires an explicit middleware + CSP review before widening headers.

## Performance And Accessibility

Targets:

| Surface | Performance target | Accessibility target |
| --- | --- | --- |
| `/` fallback | Lighthouse 100, no client dependency | WCAG AA, keyboard reachable actions |
| `/` enhanced | Fast first content, lazy enhancement | Reduced-motion and no-WASM fallback |
| `/resume` | Static HTML speed | Semantic headings, print, screen reader flow |
| `/#systems` | Interactive but bounded | Keyboard, list view, reduced motion |

Accessibility requirements:

- Skip link on every page.
- Visible focus indicators.
- Proper labels and error messages on forms.
- Decorative canvas is `aria-hidden`.
- No time-limited interactions.
- Reduced motion disables or shortens nonessential animation.
- Telemetry updates use polite announcements when shown.

## Infrastructure

Cloudflare surfaces:

- Pages: Astro output.
- Workers: contact, telemetry write, telemetry read.
- D1: coarse telemetry aggregates.
- Turnstile: contact form only.
- Optional R2: blog/media assets if needed later.

Security and privacy:

- No IP address or full user agent stored in telemetry.
- Contact form validates input, verifies Turnstile, rate-limits abuse, and
  returns stable errors.
- Telemetry stores coarse aggregate data only.
- CSP must permit the intended scripts and WASM without allowing broad unsafe
  execution.

## Milestones

| Priority | Milestone | Why it comes here |
| --- | --- | --- |
| P0 | Consolidate Planning Docs | One roadmap avoids conflicting implementation instructions. |
| P1 | Content and Resume Sync | **Largely shipped** — submodule + `sync:resume` + Zod + `resume.generated.json`; keep pins fresh and docs aligned. |
| P2 | WASM Landing and Static Resume Fallback | The first screen defines the product while keeping resume access reliable. |
| P3 | Release Guardrails | Preview, CI, rollback, and smoke tests should harden before production Workers. |
| P4 | Contact Pipeline | Contact depends on the public shell and release path. |
| P5 | Home systems strip | Interactive WASM/search/telemetry lives on **`/#systems`** after core landing/resume path on `/`. |
| ~~P6~~ | ~~Telemetry~~ | **Shipped v2.3.0** — coarse session beacon + aggregates (UI target **`/#systems`** telemetry region; legacy **`/workspace#telemetry`** retired with redirect). |

### Milestone 0: Consolidate Planning Docs

Goal: make `ROADMAP.md` the only planning source of truth.

Scope:

- Move design intent from the old design note into this file.
- Move execution order from the old execution note into this file.
- Remove the old paired docs.
- Update references that point to the removed docs.

Acceptance criteria:

- `ROADMAP.md` describes product direction, design intent, architecture
  boundaries, route model, milestones, and risks.
- No repository file points to the removed planning docs.
- `git diff --check` passes.

### Milestone 1: Content and Resume Sync

**Status:** shipped for HTML (submodule + `sync:resume` + bundled snapshot).
Optional follow-ups remain (`#systems` pane TOML/JSON, extra content collections).

Goal: structured **`resume.toml`** drives all **HTML** resume surfaces from one
normalized snapshot per deploy.

Scope (done):

- **`resume/`** git submodule → **`yanai-sh/resume`**, pinned per site commit.
- **`bun run sync:resume`** reads **`resume.toml`**, normalizes, validates with
  **`ResumeSnapshotSchema`**, writes **`content/resume.generated.json`** and
  **`content/resume.snapshot.json`**.
- **`embeddedResumeSnapshot()`** — no per-request GitHub Contents fetch for HTML.
- Unit coverage for schema + embedded snapshot.

Scope (optional / later):

- Astro **content collections** for non-resume structured content if/when
  panes deserve first-class files (`content/site.toml`, workspace data, etc.).
- More tests around edge cases in **`normalizeToml`** if upstream schema grows.

Acceptance criteria:

- Invalid **`resume.toml`** fails **`bun run sync:resume`** / **`verify`**.
- CI checks out **`submodules: recursive`** so **`verify`** always sees the pin.
- Empty optional sections render as absent UI, not blank panels.

### Milestone 2: WASM Landing and Static Resume Fallback

Goal: make `/` open on a WASM-backed first impression when supported, while
falling back to a static resume experience otherwise.

Scope:

- Define the homepage enhancement contract in code.
- Render the resume fallback server-side.
- Add visible `View resume` and `Download resume` actions.
- Lazy-load the WASM visual scene only after feature detection passes.
- Keep the scene graceful under unsupported WASM, unsupported JS,
  `prefers-reduced-motion`, small screens, and no-script browsing.
- Render `/resume` from the bundled snapshot (same pin as **`sync:resume`**).
- **`/resume.pdf`** continues to stream from **GitHub Releases** (not the TOML
  snapshot file).
- Align README paths with current repo layout and public assets.
- Audit `Layout.astro`, `middleware.ts`, and client script loading for CSP.

Acceptance criteria:

- `bun run verify` passes.
- `bun run preview` serves the built artifact.
- Manual smoke test covers `/` enhanced, `/` fallback, `/resume`,
  `/resume.pdf`, `/workspace` redirect → `/#systems`, `/404`, contact idle state,
  reduced motion, and mobile width.
- First viewport includes visible `View resume` and `Download resume`.
- Unsupported WASM renders static resume fallback instead of a broken demo.

### Milestone 3: Release Guardrails

Goal: make local, preview, and production deploy paths predictable.

Scope:

- Protect `main` with PR checks once remote flow is settled.
- Keep CI and deploy on the same `bun run verify` gate.
- Add preview smoke checklist for Pages and Worker routes.
- Add release checklist for tags, changelog entries, and production smoke tests.
- Document rollback for Pages, Workers, and D1 schema mistakes.

Acceptance criteria:

- A clean clone can run `bun install`, `bun run verify`, and `bun run build`.
- Deploy workflow has required secrets documented by name.
- `CHANGELOG.md` records user-visible changes before tags.
- Rollback steps exist.

### Milestone 4: Contact Pipeline

Goal: ship a contact path that works in production and fails politely.

Scope:

- Confirm Worker route, bindings, and form action agree.
- Add rate limiting storage or another bounded abuse control.
- Add honeypot and length checks that match the UI.
- Return stable error codes that the Astro form can display.
- Document required Cloudflare and Resend secrets.

Acceptance criteria:

- Form succeeds from production origin with a valid Turnstile token.
- Invalid origin, bad token, malformed JSON, and oversize message return
  expected responses.
- No IP address or full user agent is stored.
- Secrets are documented by name only.

### Milestone 5: Home systems strip (`/#systems`)

Goal: deliver the interactive proof-of-work (canvas, search, telemetry readout,
projects/stack copy) on the home document inside **`#systems`**, without
requiring a second route for the happy path.

Scope:

- Define section ids and keyboard order for the systems region (single-page hash
  targets under `/`, e.g. `#systems`, optional sub-anchors as needed).
- Implement navigation and focus management inside **`#systems`** (search panel
  or modal, telemetry slots).
- Render projects, now, stack, uses/reading, and telemetry content from existing
  config + APIs.
- Wire Rust/WASM canvas into the systems preview (non-SAB preferred on `/`).
- Wire WASM search through a Web Worker (Comlink optional).
- Provide list view and reduced-motion stacked layout for the systems region.

Acceptance criteria:

- **`/#systems`** (and legacy **`/workspace`** redirect) land on readable systems
  content; in-page deep links behave predictably with browser history.
- Keyboard users can enter, navigate, scroll inside the systems region, and exit.
- Reduced-motion users get full content without animated canvas requirements.
- WASM load failure leaves readable content and a visible fallback.
- COOP/COEP on `/` only if SharedArrayBuffer is explicitly required and reviewed;
  otherwise omit on `/`.

### Milestone 6: Telemetry

**Shipped:** [2.3.0] (2026-05-06) — see **`CHANGELOG.md`**.

Goal: show live operational data without turning the site into a tracking sink.

Scope:

- Decide exact beacon payload and keep it coarse.
- Wire session creation, LCP, WASM init timing, and frame samples.
- ~~Deploy D1 migrations and bind read/write Workers~~ **Done:** **`DB`** binding + migrations folder on **`apps/site/wrangler.jsonc`**; endpoints live beside **`/api/contact`**.
- Render aggregate telemetry in the **`/#systems`** telemetry region.
- Add cache and retention rules that match the privacy posture.

Acceptance criteria:

- Read endpoint returns cached aggregate data with no raw identifiers.
- Write endpoint rejects malformed UUIDs and unbounded sample arrays.
- Telemetry UI on `/` explains data through labels and numbers.
- A user can block telemetry without breaking the site.

## Backlog

High-value candidates:

- RSS feed and blog route if writing becomes part of the site.
- Additional Playwright coverage beyond existing landing + **`/#systems`** smoke (including telemetry slots and DNT beacons).
- Lighthouse budgets for fallback and enhanced paths.
- Worker tests with Miniflare or Wrangler test helpers.
- OpenTofu documentation for Cloudflare resources after manual setup stops
  changing.
- Guestbook pane only after telemetry and moderation rules are clear.

Defer for now:

- A full blog system before there are posts worth publishing.
- Extra frontend frameworks inside WASM islands.
- Broad analytics beyond coarse aggregate telemetry.
- Release automation that creates more maintenance than the solo repo needs.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| WASM-first homepage blocks recruiter access | Server-render resume fallback and keep resume actions visible before enhancement. |
| WASM-first homepage bloats `/` | Lazy-load the enhancement, enforce size budgets, and render fallback first. |
| Homepage WASM forces broader COOP/COEP scope | Prefer a non-SAB homepage scene; make shared-memory headers an explicit decision if needed. |
| `/workspace` bookmark drift | Keep **308** from `/workspace` to `/#systems` until traffic is negligible. |
| SharedArrayBuffer headers break third-party assets | Prefer non-SAB WASM on `/`; widen COOP/COEP to `/` only after explicit review. |
| Submodule not initialized | **`verify`** fails until `git submodule update --init --recursive`; CI must use `submodules: recursive`. |
| HTML vs PDF version skew | Cut a **`yanai-sh/resume`** release when the PDF should match a new TOML pin. |
| Contact endpoint attracts spam | Use Turnstile, rate limiting, honeypot fields, and short retention. |
| Telemetry becomes invasive | Store aggregates and coarse client data only; avoid IPs and full UA strings. |
| Design drifts into template styling | Use project tokens, 1px borders, dense layout, and restrained actions. |
| Roadmap goes stale | Update this file at milestone boundaries and after scope changes. |

## Maintenance

Update this roadmap when a milestone starts, ships, or changes scope. Move
shipped facts into `CHANGELOG.md`; keep this file focused on decisions and work
still ahead.
