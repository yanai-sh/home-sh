# Roadmap

Status date: 2026-05-04

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

The site has four public surfaces:

| Route | Role |
| --- | --- |
| `/` | Progressive landing: SSR resume fallback first, WASM visual enhancement second. |
| `/resume` | Full semantic HTML resume, readable, printable, no WASM required. |
| `/resume.pdf` | Generated PDF artifact from the same resume source. |
| `/workspace` | Deeper opt-in systems demo: panes, search, canvas, telemetry. |

The practical user flow is simple: see the technical signal, view the static
resume, download the PDF. The technical user can enter `/workspace` for the
deeper architecture demo.

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

- `/` may use WASM and canvas only as a lazy enhancement.
- `/resume` must be semantic HTML with normal vertical scroll.
- `/workspace` can use richer interaction, but it must provide list view and
  reduced-motion fallbacks.
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
- Structured content feeds all resume surfaces.

Boundary decisions:

- Prefer a non-SharedArrayBuffer WASM scene on `/`.
- Keep COOP/COEP scoped to `/workspace` unless the homepage design explicitly
  requires shared memory. If `/` needs SharedArrayBuffer, document and review
  the header tradeoff before implementation.
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

- Content sources need schemas, real data, and route integration.
- Resume data should come from `https://github.com/yanai-sh/resume`, with
  `yanai-sh` as the GitHub owner.
- `/` needs a progressive landing contract: SSR fallback first, feature-detected
  WASM layer second.
- `/resume.pdf` must move from backlog to launch requirement because the first
  viewport will expose `Download resume`.
- Brand assets, README references, and current public paths need a consistency
  pass.
- End-to-end checks need to cover Cloudflare preview behavior, not only unit
  tests and Astro diagnostics.
- Contact Worker needs production hardening before relying on it.
- `/workspace` needs pane navigation, reduced-motion/list view, and real content.
- Telemetry needs production wiring after `/workspace` has a stable pane model.

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

Resume information comes from the canonical upstream repository:

```text
https://github.com/yanai-sh/resume
```

Build-time flow:

```text
yanai-sh/resume:resume.toml
  -> sync script
  -> checked-in fallback snapshot
  -> local normalized resume data
  -> Astro content/schema validation
  -> homepage fallback summary
  -> /resume
  -> /resume.pdf
  -> search index entries
```

Rules:

- The site must build when GitHub is unavailable if the fallback snapshot is
  valid.
- The upstream resume repository is a Rust/TOML/Tectonic project. Consume
  `resume.toml` from the repository root; do not infer JSON Resume unless the
  upstream repo changes format.
- The sync path must be portable. Do not prefer a local checkout; use GitHub
  first, then the checked-in fallback snapshot.
- The synced data must normalize into one local schema before rendering.
- `/resume`, `/resume.pdf`, and homepage fallback content must use the same
  normalized source.
- PDF generation should be deterministic and run in CI once enabled.
- Local content can supplement the resume source, but duplicated resume facts
  should be avoided.

## Route Model

### `/`

Server-render:

- name and role
- compact resume summary
- latest or strongest proof points
- `View resume`
- `Download resume`
- link to `/workspace`
- no broken empty state if scripts fail

Enhance when supported:

- WASM/canvas visual scene
- visible technical status labels
- subtle motion tied to pointer/scroll/device capabilities
- fallback preserved in DOM

Acceptance:

- First viewport contains `View resume` and `Download resume`.
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
- Provenance: source repo, last sync date, fallback snapshot indicator.

Acceptance:

- Works without JavaScript.
- Prints cleanly.
- Uses the same normalized resume source as PDF.
- Avoids decorative template chrome.

### `/resume.pdf`

Purpose:

- recruiter/ATS artifact
- stable download target for buttons and signatures

Acceptance:

- Generated from the same normalized resume source.
- Build fails when PDF generation fails after this gate is enabled.
- Opens cleanly in common PDF viewers.

### `/workspace`

Purpose:

- deeper systems demo after the landing page
- place for richer WASM/search/telemetry work

Planned panes:

- projects
- now
- stack
- reading or uses
- telemetry
- optional resume/search pane

Acceptance:

- Deep links like `/workspace#stack` open the correct pane.
- Keyboard and pointer navigation work.
- List view is always available.
- Reduced-motion users get stacked semantic content.
- COOP/COEP headers appear on `/workspace` and not on `/`, unless a later
  documented decision changes the homepage header boundary.

## Performance And Accessibility

Targets:

| Surface | Performance target | Accessibility target |
| --- | --- | --- |
| `/` fallback | Lighthouse 100, no client dependency | WCAG AA, keyboard reachable actions |
| `/` enhanced | Fast first content, lazy enhancement | Reduced-motion and no-WASM fallback |
| `/resume` | Static HTML speed | Semantic headings, print, screen reader flow |
| `/workspace` | Interactive but bounded | Keyboard, list view, reduced motion |

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
| P1 | Content and Resume Sync | Resume data must exist before fallback, `/resume`, and PDF can ship. |
| P2 | WASM Landing and Static Resume Fallback | The first screen defines the product while keeping resume access reliable. |
| P3 | Release Guardrails | Preview, CI, rollback, and smoke tests should harden before production Workers. |
| P4 | Contact Pipeline | Contact depends on the public shell and release path. |
| P5 | Workspace Alpha | Deeper interactive systems work follows the core landing/resume path. |
| P6 | Telemetry | Telemetry depends on stable workspace panes and beacon payloads. |

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

Goal: make structured content the source of truth for the site and future PDF.

Scope:

- Add Astro content schemas for site metadata, resume, workspace panes, and any
  project entries.
- Add a build-time resume sync from `https://github.com/yanai-sh/resume`.
- Normalize pulled resume data into the local schema.
- Keep a checked-in fallback snapshot.
- Fill `content/site.toml` and `content/workspace/*.toml` with useful data.
- Generate data for homepage fallback, `/resume`, `/resume.pdf`, and search.
- Add focused tests for schema transforms if custom parsing appears.

Acceptance criteria:

- Invalid content fails `bun run typecheck` or a focused test.
- Resume sync uses GitHub owner `yanai-sh` and repository `resume`.
- Failed GitHub fetch does not fail the build when the fallback snapshot is
  valid.
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
- Render `/resume` from the synced snapshot.
- Generate or stage `/resume.pdf` from the same snapshot.
- Align README paths with current repo layout and public assets.
- Audit `Layout.astro`, `middleware.ts`, and client script loading for CSP.

Acceptance criteria:

- `bun run verify` passes.
- `bun run preview` serves the built artifact.
- Manual smoke test covers `/` enhanced, `/` fallback, `/resume`,
  `/resume.pdf`, `/workspace`, `/404`, contact idle state, reduced motion, and
  mobile width.
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

### Milestone 5: Workspace Alpha

Goal: turn `/workspace` into the deeper interactive proof of work.

Scope:

- Define the pane model: id, title, content source, keyboard order, and hash.
- Implement horizontal navigation with hash sync and sane browser back behavior.
- Render panes for projects, now, stack, uses or reading, and telemetry.
- Wire Rust/WASM canvas into the workspace background or pane preview.
- Wire WASM search through a Web Worker and Comlink where it improves the
  experience.
- Provide list view and reduced-motion stacked layout.

Acceptance criteria:

- Deep links like `/workspace#stack` open the right pane.
- Keyboard users can enter, navigate, scroll inside a pane, and exit.
- Reduced-motion users get full content without animated canvas requirements.
- WASM load failure leaves readable content and a visible fallback.
- COOP/COEP headers appear on `/workspace`.

### Milestone 6: Telemetry

Goal: show live operational data without turning the site into a tracking sink.

Scope:

- Decide exact beacon payload and keep it coarse.
- Wire session creation, LCP, WASM init timing, and frame samples.
- Deploy D1 migrations and bind read/write Workers.
- Render aggregate telemetry in `/workspace#telemetry`.
- Add cache and retention rules that match the privacy posture.

Acceptance criteria:

- Read endpoint returns cached aggregate data with no raw identifiers.
- Write endpoint rejects malformed UUIDs and unbounded sample arrays.
- Telemetry pane explains data through labels and numbers.
- A user can block telemetry without breaking the site.

## Backlog

High-value candidates:

- RSS feed and blog route if writing becomes part of the site.
- Playwright smoke tests for first viewport, reduced motion, and workspace hash
  navigation.
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
| `/workspace` becomes redundant | Keep `/workspace` focused on deeper panes, search, telemetry, and inspectable systems behavior. |
| SharedArrayBuffer headers break third-party assets | Scope COOP/COEP to `/workspace` unless a documented decision changes it. |
| GitHub resume fetch fails | Build from checked-in fallback snapshot. |
| Contact endpoint attracts spam | Use Turnstile, rate limiting, honeypot fields, and short retention. |
| Telemetry becomes invasive | Store aggregates and coarse client data only; avoid IPs and full UA strings. |
| Design drifts into template styling | Use project tokens, 1px borders, dense layout, and restrained actions. |
| Roadmap goes stale | Update this file at milestone boundaries and after scope changes. |

## Maintenance

Update this roadmap when a milestone starts, ships, or changes scope. Move
shipped facts into `CHANGELOG.md`; keep this file focused on decisions and work
still ahead.
