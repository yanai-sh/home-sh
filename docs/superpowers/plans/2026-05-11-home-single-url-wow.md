# Home single-URL “wow” + hardening implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the primary technical and resume experience entirely on `https://yanai.sh/` (path `/`) with no full document navigation required for the happy path, lazy-loaded WASM/visual “wow” on the first URL, and the roadmap follow-ups (M2 polish, M3 smoke, M4 contact confidence, brand/meta consistency) executed in a way that matches that product constraint.

**Architecture:** Keep Astro SSR for the first byte: hero, resume summary, and `View resume` / `Download resume` equivalents stay in the initial HTML. Colocate former `/workspace` capabilities (search, canvas/WASM preview, optional aggregate telemetry UI) as **same-document sections** or **`<dialog>`** islands below the hero, hydrated only after `requestIdleCallback` or `matchMedia`/feature probes pass. Prefer **non–SharedArrayBuffer** WASM on `/` per `ROADMAP.md` + `middleware.ts` (COOP/COEP today only on `/workspace`); if a feature truly requires SAB, add an explicit middleware + CSP review subtask before widening headers to `/`. Secondary routes `/resume`, `/resume.pdf`, `/api/*` remain for print, PDF, crawlers, and APIs, but **primary CTAs on `/` scroll or open in-page UI** instead of requiring navigation. Optional: enable `<ClientRouter />` from `astro:transitions` on secondary pages only if you keep bookmarkable `/resume` for edge cases—**not required** if `/` carries full semantic resume in-document.

**Tech Stack:** Astro 6 (`apps/site`), Bun, Playwright (`apps/site/tests/smoke`), Cloudflare Worker routes (`apps/site/src/pages/api/*`), Rust/WASM packages under `apps/wasm/*`, existing resume pipeline (`bun run sync:resume` → `content/resume.generated.json`).

---

## File map (expected churn)

| Area | Primary files |
| --- | --- |
| Home composition | `apps/site/src/pages/index.astro`, `apps/site/src/components/*` (split new `HomeSystems.astro` or similar from workspace patterns) |
| Former workspace UI | `apps/site/src/pages/workspace/index.astro` (thin redirect or removal), `apps/site/src/config/workspace.ts`, workspace client scripts under `apps/site/src/` (grep `ws-`, `workspace`) |
| Edge headers | `apps/site/src/middleware.ts` |
| Layout / meta | `apps/site/src/layouts/Layout.astro`, `apps/site/src/config/site.ts`, `README.md` |
| Contact | `apps/site/src/pages/api/contact.ts`, `apps/site/src/components/ContactForm.astro`, `apps/site/src/__tests__/` or colocated `*.test.ts` |
| Telemetry UI client | Whatever script powers `data-telemetry-stat` today (grep from workspace); relocate init to `/` section |
| Smoke | `apps/site/tests/smoke/landing.spec.ts`, `apps/site/tests/smoke/workspace.spec.ts` |
| Planning source of truth | `ROADMAP.md` |

---

### Task 0: Align `ROADMAP.md` with single-URL primary experience

**Files:**
- Modify: `ROADMAP.md` (Product Direction, Route Model `/` and `/workspace`, Milestone 5 framing, risk “`/workspace` becomes redundant”)

- [ ] **Step 1: Edit Product Direction** so `/` is the only required surface for the “technical first impression + resume path,” and `/workspace` is deprecated, redirect-only, or explicitly “legacy demo” with no unique capability.

- [ ] **Step 2: Edit Route Model — `/`** to list same-page sections (`#hero`, `#resume`, `#systems`, `#contact`) and require primary CTAs to use `href="#…"` (or buttons that scroll) instead of `href="/resume"` for the default labels. Keep `/resume` documented as optional deep link / print.

- [ ] **Step 3: Edit Milestone 5** title or scope to “Systems strip on `/`” (or strike through and replace with a new milestone id) so agents are not instructed to deepen `/workspace` as the main interactive milestone.

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md
git commit -m "docs(roadmap): single-URL primary experience on /"
```

---

### Task 1: Primary CTAs on `/` use in-document targets (no navigation for happy path)

**Files:**
- Modify: `apps/site/src/components/ResumeShowcase.astro` (or the component that renders `href="/resume"` / `href="/resume.pdf"`)
- Modify: `apps/site/src/components/Lede.astro`, `apps/site/src/components/Hero.astro` if they contain outbound resume links
- Possibly modify: `apps/site/src/components/Footer.astro` for secondary “Printable `/resume`” link

- [ ] **Step 1: Inventory current links** — run:

```bash
rg 'href="/resume"' apps/site/src/components apps/site/src/pages/index.astro
rg 'href="/resume.pdf"' apps/site/src/components apps/site/src/pages/index.astro
```

- [ ] **Step 2: Change primary buttons** to same-page anchors, e.g. `href="#resume-full"` for “View resume” and keep PDF as **direct file download** using `href="/resume.pdf"` with `download` attribute **only if** the Worker response sets `Content-Disposition: attachment` (verify); otherwise use a `<button type="button">` that `window.open('/resume.pdf', '_blank')` so the SPA-like expectation (“I stay on yanai.sh”) holds—pick one pattern and document it in the component comment.

Example (anchor pattern; adjust selector to your markup):

```astro
<a class="resume-cta" href="#resume-full">View resume</a>
<a class="resume-cta" href="/resume.pdf" target="_blank" rel="noopener">Download PDF</a>
```

- [ ] **Step 3: Add a visually distinct full-resume region** `id="resume-full"` on `index.astro` that renders the same semantic resume as `resume.astro` by **extracting** the resume body into a shared partial or importing a single `ResumeDocument.astro` used by both `index.astro` (full section) and `resume.astro` (full page layout). This avoids duplicating facts outside `resume.toml`.

- [ ] **Step 4: Run**

```bash
cd /home/yanai/dev/sandbox/home-sh && bun run verify
```

Expected: PASS (fix any duplicate-import or circular layout issues).

- [ ] **Step 5: Commit** after green verify.

---

### Task 2: Embed “systems / wow” strip on `/` (migrate off `/workspace` dependency)

**Files:**
- Create: `apps/site/src/components/HomeSystems.astro` (static shell: heading, mount points `id="home-search-root"`, `id="home-canvas"`, `data-telemetry-stat` slots mirroring workspace)
- Modify: `apps/site/src/pages/index.astro` — include `<HomeSystems />` after `ResumeShowcase` and before `ContactForm` (order adjustable)
- Modify: move or re-export client entry from workspace scripts — locate with:

```bash
rg 'ws-rust-canvas|ws-search|workspace' apps/site/src --glob '*.{ts,astro,mjs}'
```

- [ ] **Step 1: Copy the minimal DOM contract** from `apps/site/src/pages/workspace/index.astro` for canvas + search trigger into `HomeSystems.astro` with new ids (`home-rust-canvas`, `home-search-trigger`) to avoid collisions if `/workspace` still exists temporarily.

- [ ] **Step 2: Deduplicate client boot** — if a `*-client.ts` currently queries `#ws-rust-canvas`, parameterize selectors or export `mountHomeSystems({ canvasId, searchTriggerId })` from a small `apps/site/src/lib/home-systems-mount.ts` consumed by one client script loaded from `index.astro`.

- [ ] **Step 3: Lazy load** the client script from `index.astro` using the same pattern as existing home lattice (e.g. `<script src={…} defer>` or Astro `define:vars` + dynamic `import()` inside an inline module after `document.documentElement.classList` / WASM probe—match existing `SceneCanvas` / lattice approach in `apps/site/src/components/SceneCanvas.astro` and `HomeLattice`).

- [ ] **Step 4: `bun run verify`**

- [ ] **Step 5: Commit**

---

### Task 3: Telemetry readout + beacon on `/` (parity with workspace pane)

**Files:**
- Grep-driven modify: client that POSTs `/api/telemetry/beacon` and GETs `/api/telemetry/stats` (today likely only on workspace)
- Modify: `apps/site/src/middleware.ts` only if CSP `connect-src` blocks fetches (today `'self'` should allow same-origin XHR/fetch to `/api/*`)

- [ ] **Step 1: Find beacon init** — run:

```bash
rg 'telemetry/beacon|telemetry/stats|data-telemetry-stat' apps/site/src
```

- [ ] **Step 2: Ensure one initialization path** mounts on `#home-telemetry` inside `HomeSystems.astro` and **does not double-fire** if the user hit a cached `/workspace` redirect later.

- [ ] **Step 3: Port DNT / localStorage opt-out behavior** unchanged from workspace implementation.

- [ ] **Step 4: Add unit or handler tests** if missing for stats shape—reuse patterns in `apps/site/src/__tests__/` for `/api/telemetry/*`.

- [ ] **Step 5: `bun run verify` + commit**

---

### Task 4: Deprecate `/workspace` as a destination

**Files:**
- Modify: `apps/site/src/pages/workspace/index.astro` **or** replace with `apps/site/src/pages/workspace/index.ts` redirect response (Astro static redirect in frontmatter if supported; otherwise middleware redirect)

Preferred pattern (middleware, single source of truth):

**Modify:** `apps/site/src/middleware.ts` — before `next()`, if `pathname === '/workspace' || pathname.startsWith('/workspace/')`, return `308` to `new URL('/#systems', url)` **or** preserve hash: map `/workspace#stack` → `/#systems-stack` (only if you implement hash routers on `/`; simplest is `/#systems` only).

```ts
// Inside onRequest, before const response = await next();
const url = new URL(context.request.url);
if (url.pathname === '/workspace' || url.pathname.startsWith('/workspace/')) {
  const target = new URL('/', url.origin);
  target.hash = 'systems';
  return Response.redirect(target.toString(), 308);
}
```

**Caution:** inserting early `return` bypasses `next()`—you must still attach security headers consistent with other responses, or delegate to a tiny helper. Alternatively keep `next()` and implement redirect in the workspace page only—pick one approach in implementation and delete the dead path.

- [ ] **Step 1: Implement redirect** and remove inbound links to `/workspace` from `index.astro`, `Footer.astro`, `README.md`.

- [ ] **Step 2: Decide COOP/COEP** — if `/workspace` is gone and canvas moved to `/`, **remove** the `/workspace` COOP block **only after** confirming WASM does not need `crossOriginIsolated`. If tests fail for SAB, stop and open a sub-plan item: “Enable COOP/COEP on `/` + fix CORP for fonts/images” with explicit CSP updates.

- [ ] **Step 3: `bun run verify` + smoke** (Task 9 will rewrite smoke; optional quick manual `curl -I` for `/workspace`).

- [ ] **Step 4: Commit**

---

### Task 5: M2 — Lazy WASM / motion contract on `/`

**Files:**
- Modify: `apps/site/src/components/SceneCanvas.astro`, `HomeLattice.astro`, new `HomeSystems` client mount, `apps/site/src/design/tokens.ts` only if budget tokens needed

- [ ] **Step 1: Document the contract** in a short comment block at top of `SceneCanvas.astro` (or `apps/site/src/lib/home-enhancement.ts`): enhancement loads after `requestAnimationFrame` + WASM probe; max bundle size budget stated as a number (e.g. “WASM fetch < 300KB gzip” — measure with `ls -la apps/site/dist/client/_astro/*wasm*` after build).

- [ ] **Step 2: `prefers-reduced-motion: reduce`** must skip canvas rAF loops and still show `HomeSystems` prose + search list view (mirror workspace reduced-motion CSS patterns from `workspace/index.astro` `<style>` — extract shared `@layer` rules to `apps/site/src/styles/global.css` or a `workspace-shell.css` renamed to `systems.css`).

- [ ] **Step 3: `bun run verify`**

- [ ] **Step 4: Commit**

---

### Task 6: M4 — Contact pipeline confidence

**Files:**
- Modify: `apps/site/src/pages/api/contact.ts`
- Modify: `apps/site/src/components/ContactForm.astro`
- Test: `apps/site/src/__tests__/` (glob `contact`)

- [ ] **Step 1: Read current handler** and list invariants: Turnstile verify, origin check, rate limit, honeypot, max body size.

- [ ] **Step 2: Add one Playwright test** on `/` that posts an intentionally oversized message (if test env allows) or unit-test the handler with `Request` stubs—follow existing test style in the repo.

Example Playwright expectation (adapt selectors):

```ts
test('contact form shows error for oversized message', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const body = page.locator('#contact-form textarea[name="message"]');
  await body.fill('x'.repeat(20000));
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#contact-form [role="alert"]')).toBeVisible();
});
```

- [ ] **Step 3: `bun run verify`**

- [ ] **Step 4: Commit**

---

### Task 7: Brand / OG / README consistency pass

**Files:**
- Modify: `apps/site/src/config/site.ts`, `README.md`, `apps/site/src/layouts/Layout.astro` if `SITE_OG_IMAGE_PATH` wrong
- Verify asset: `apps/site/public/brand/` (og image path)

- [ ] **Step 1: Compare** `SITE_URL`, `SITE_TITLE`, README deploy URLs, and `ROADMAP.md` infra names—fix mismatches.

- [ ] **Step 2: `curl -sI $SITE_URL` locally against preview** is optional; at minimum `bun run build` ensures OG tags render.

- [ ] **Step 3: Commit**

---

### Task 8: M3 — Playwright smoke updates for single-URL model

**Files:**
- Modify: `apps/site/tests/smoke/landing.spec.ts`
- Modify: `apps/site/tests/smoke/workspace.spec.ts` (retarget to `/` + `#systems` or delete if redundant)
- Modify: `apps/site/tests/smoke/playwright.config.ts` only if preview command needs change

- [ ] **Step 1: Update first test** — replace `a[href="/resume"]` visibility with `#resume-full` heading visibility (pick a stable selector from the shared resume partial).

```ts
test('first viewport shows in-page resume target', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('a[href="#resume-full"]').first()).toBeVisible();
});
```

- [ ] **Step 2: Move telemetry DOM assertions** from `workspace.spec.ts` to `landing.spec.ts` using `await page.goto(`${BASE}/#systems`);` and the same `data-telemetry-stat` selectors.

- [ ] **Step 3: Add test** `goto('/workspace')` expects final URL pathname `/` and hash `#systems` (if middleware redirect).

```ts
test('legacy /workspace redirects to /#systems', async ({ page }) => {
  const res = await page.goto(`${BASE}/workspace`, { waitUntil: 'commit' });
  expect(res?.status()).toBe(308); // or 200 + meta refresh—match implementation
});
```

Adjust status expectation if redirect is implemented in HTML rather than HTTP.

- [ ] **Step 4: Run**

```bash
cd /home/yanai/dev/sandbox/home-sh/apps/site && bun run smoke
```

Expected: PASS locally against preview (fix skips if secrets missing).

- [ ] **Step 5: Commit**

---

### Task 9: Optional — `<ClientRouter />` on remaining routes

**Only if** you keep `/resume` as a separate HTML document for crawlers but want **no full reload** when a user follows a footer link: set `clientRouter` default `true` in `Layout.astro` and add `transition:animate` directives per Astro docs. **Skip this task** if `/` contains the full printable resume and `/resume` becomes a thin redirect to `/#resume-full` (then crawlers rely on semantic single page—verify SEO acceptance).

- [ ] **Step 1: Decision recorded** in `ROADMAP.md` Route Model.

- [ ] **Step 2: Implement or skip with justification in CHANGELOG [Unreleased].**

---

### Task 10: Final integration gate

- [ ] **Step 1: `bun run verify` from repo root**

- [ ] **Step 2: `bun run smoke` with local preview** per `AGENTS.md`

- [ ] **Step 3: Update `CHANGELOG.md` `[Unreleased]`** with user-facing summary: single-page primary experience, `/workspace` redirect, contact/smoke updates.

- [ ] **Step 4: Commit** `chore(release): prepare single-url home experience`

---

## Self-review (spec coverage)

| Requirement | Task |
| --- | --- |
| Wow on initial landing | Tasks 2, 5 |
| No required navigation away from `/` | Tasks 1, 4 |
| No full page reload for primary UX | Tasks 1 (same-doc), 4 (remove workspace), optional Task 9 |
| M2 lazy WASM + fallback | Task 5 + existing SSR in Task 1 |
| M3 smoke | Task 8 |
| M4 contact | Task 6 |
| Brand/meta | Task 7 |
| Planning alignment | Task 0 |
| SAB / COOP risk | Called out in Task 4 Step 2 |

**Placeholder scan:** None intentional; implementer must fill exact selectors (`#resume-full`, `#systems`) after Task 1 markup exists.

**Type consistency:** Hash targets in tests must match Astro `id` attributes exactly.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-home-single-url-wow.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development`

2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

**Which approach?**
