# M5 — Workspace Alpha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all five M5 acceptance criteria from ROADMAP.md (deep links, keyboard navigation, reduced-motion, WASM-failure fallback, COOP/COEP) and tag a release.

**Architecture:** `/workspace` is already substantially built — five panes (projects / resume / stack / uses / telemetry), WASM bridge (SAB), WASM canvas (lyon tessellation), WASM search via Web Worker, COOP/COEP scoped, runtime-status strip. M5 closes the remaining gaps: (1) accessible pane focus on hash navigation, (2) reduced-motion stacked layout for the canvas pane, (3) animated canvas driven by SharedArrayBuffer-backed mouse coordinates via a rAF loop, (4) Playwright smoke coverage over every acceptance gate, and (5) version bump.

**Tech Stack:** Astro 6 + `@astrojs/cloudflare` v13, Rust 2021 + lyon (built via `wasm-pack` to `apps/site/public/wasm/canvas/`), `wasm-bindgen`, `SharedArrayBuffer` (requires COOP/COEP — already scoped to `/workspace`), Playwright (smoke suite at `apps/site/tests/smoke/`), Bun.

---

## Context

**State of `/workspace` before M5 starts** (git SHA `c2c4be9` post-v2.1.0):

- `apps/site/src/pages/workspace/index.astro` renders all five panes server-side; pane navigation is a sticky sidebar (collapsing to a horizontal scroll on mobile <860px).
- `apps/site/src/lib/workspace-wip-client.ts` mounts: SAB writers (pointermove → mouse_x/y, scroll → scroll_vx, visibility → tick_target), one-shot canvas render via `render_lattice`, search modal client (Web Worker + WASM nucleo), and pane navigation (IntersectionObserver → aria-current; hashchange → aria-current).
- `apps/site/src/lib/workspace-search-worker.ts` runs the WASM search index in a Worker; hand-rolled message-id correlator (no Comlink — kept as-is per ROADMAP's "where it improves the experience" qualifier).
- `apps/wasm/bridge/src/lib.rs` defines a 32-byte `SharedState` struct (mouse_x, mouse_y, scroll_vx, tilt_x, tilt_y, tick_target, frame_counter, \_padding); JS reads/writes it via `Float32Array`/`Uint32Array` views in `apps/site/src/lib/shared-state.ts`.
- `apps/wasm/canvas/src/lib.rs` exports `render_lattice(canvas, width, height) -> Result<u32, JsValue>` using lyon's stroke tessellator; static lean (`((row + col) * 0.73).sin() * 10.0`).
- `apps/site/public/_headers` scopes COOP/COEP to `/workspace/*` only; `apps/site/src/middleware.ts` mirrors the same condition for SSR responses.
- WASM artifacts (`apps/site/public/wasm/{bridge,canvas,search}/`) are **committed** to git, not built in CI; rebuild via `just wasm-build` after Rust changes.
- Smoke suite has one workspace assertion (`workspace renders without errors`).

**M5 acceptance criteria (ROADMAP.md:440-446) and where each lands:**

| #   | Criterion                                                                  | Status pre-M5                                     | Closed by                 |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| 1   | Deep links like `/workspace#stack` open the right pane                     | ✓ (browser fragment-nav)                          | covered by smoke (Task 5) |
| 2   | Keyboard users can enter, navigate, scroll inside a pane, and exit         | ✗ (no focus management on hash nav)               | Task 2 + smoke (Task 5)   |
| 3   | Reduced-motion users get full content without animated canvas requirements | partial (canvas hidden but pane-grid stays 2-col) | Task 1 + smoke (Task 5)   |
| 4   | WASM load failure leaves readable content and a visible fallback           | ✓ (status strip + `<p>` fallback already present) | covered by smoke (Task 5) |
| 5   | COOP/COEP headers appear on `/workspace`                                   | ✓ (closed in M2)                                  | covered by smoke (Task 5) |

Animated canvas is in scope under "Wire Rust/WASM canvas into the workspace background or pane preview" (line 435). Tasks 3+4 cover it.

**What's NOT in this plan:**

- M6 telemetry (live counters in the telemetry pane) — separate plan.
- Comlink refactor of the search worker — current hand-rolled client is ~40 lines and works; ROADMAP qualifier "where it improves the experience" gives latitude.
- Horizontal pane layout — current vertical-stack-with-sticky-sidebar is acceptance-compliant.

**Conventions:**

- File paths are absolute from repo root (`apps/site/...`, `apps/wasm/...`).
- Each step is one action, ≤5 minutes.
- Smoke tests run via `bun run --cwd apps/site smoke` after `bun run --cwd apps/site build`.
- Branch protection requires PRs; create one feat branch (`feat/m5-workspace-alpha`) for tasks 1–5 and one chore branch (`chore/release-v2.2.0`) for task 6.

---

### Task 1: Reduced-motion layout collapse (CSS only)

**Files:**

- Modify: `apps/site/src/pages/workspace/index.astro:663-667` (the existing `@media (prefers-reduced-motion: reduce)` block)

**Why:** ROADMAP M5 acceptance criterion #3 requires reduced-motion users to "get full content without animated canvas requirements." The current rule hides the `<canvas>` but `pane--canvas` keeps `grid-template-columns: minmax(0, 0.88fr) minmax(18rem, 1fr)`, so the right column is empty and the prose column is needlessly cramped. Collapse to single column on reduced-motion.

- [ ] **Step 1: Open the workspace page in a reduced-motion preview**

```sh
eval "$(SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt sops --decrypt --input-type json --output-type json infra/tofu/secrets.enc.json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value)"')"
bun run --cwd apps/site build
bun run --cwd apps/site preview &
sleep 4
# Visit http://127.0.0.1:4321/workspace#projects with DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce".
# Confirm: canvas hidden but right-column real estate is empty (the bug we're fixing).
pkill -f 'astro preview'
```

- [ ] **Step 2: Replace the reduced-motion rule with the collapsed-layout rule**

In `apps/site/src/pages/workspace/index.astro`, find the existing block:

```css
@media (prefers-reduced-motion: reduce) {
  .canvas-frame canvas {
    display: none;
  }
}
```

Replace it with:

```css
@media (prefers-reduced-motion: reduce) {
  .canvas-frame canvas {
    display: none;
  }
  .canvas-frame {
    display: none;
  }
  .pane--canvas {
    grid-template-columns: 1fr;
  }
}
```

The `.canvas-frame { display: none }` rule removes the empty placeholder block entirely (the `<p>` fallback inside is informational only — removing it on reduced-motion is intentional, since the prose column already explains the projects).

- [ ] **Step 3: Verify the rebuild + preview**

```sh
bun run --cwd apps/site build
bun run --cwd apps/site preview &
sleep 4
# Visit http://127.0.0.1:4321/workspace#projects with prefers-reduced-motion: reduce emulated.
# Confirm: prose column spans full pane width, no empty right column.
pkill -f 'astro preview'
```

- [ ] **Step 4: Commit**

```sh
git add apps/site/src/pages/workspace/index.astro
git commit -m "fix(workspace): collapse projects pane to single column on reduced-motion"
```

---

### Task 2: Pane focus management on hash navigation

**Files:**

- Modify: `apps/site/src/pages/workspace/index.astro` (add `tabindex="-1"` to each `<h2>` inside a pane, so it's programmatically focusable)
- Modify: `apps/site/src/lib/workspace-wip-client.ts:319-350` (`mountPaneNavigation` — focus the pane heading on `hashchange` and on initial-load deep-link)

**Why:** ROADMAP M5 acceptance criterion #2 requires "Keyboard users can enter, navigate, scroll inside a pane, and exit." Currently:

- Clicking a pane-nav link uses default `<a href="#stack">` behavior — the browser scrolls to `#stack` but **does not** move focus into the pane (focus stays on the link).
- A screen-reader user clicking a nav link doesn't get the pane heading announced.
- Tab order from the nav link goes back to the next nav link, not into pane content.

Fix: on `hashchange` (and initial load when `location.hash` is present), focus the pane's heading. This:

- Moves the focus ring into the pane, so subsequent Tab presses traverse pane content.
- Announces the heading to screen readers.
- "Exit" works via Shift+Tab back into the nav, or by clicking another nav link (idiomatic web-app pattern; no special exit key needed).

- [ ] **Step 1: Add `tabindex="-1"` to every pane heading**

In `apps/site/src/pages/workspace/index.astro`, modify each pane heading. Five edits, one per pane:

```astro
<h2 id="projects-title" tabindex="-1">current build surface</h2>
```

```astro
<h2 id="resume-pane-title" tabindex="-1">{resume.header.headline}</h2>
```

```astro
<h2 id="stack-title" tabindex="-1">working set</h2>
```

```astro
<h2 id="uses-title" tabindex="-1">tools and current work</h2>
```

```astro
<h2 id="telemetry-title" tabindex="-1">local runtime proof</h2>
```

The `tabindex="-1"` makes the heading programmatically focusable (via `.focus()`) without inserting it into the natural Tab order.

- [ ] **Step 2: Update `mountPaneNavigation` to focus the heading on hash change**

In `apps/site/src/lib/workspace-wip-client.ts`, replace the entire `mountPaneNavigation` function (currently lines 319-350) with:

```ts
function mountPaneNavigation(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-pane-link]")];
  const panes = [...document.querySelectorAll<HTMLElement>("[data-pane]")];
  if (links.length === 0 || panes.length === 0) return;

  const setActive = (id: string) => {
    for (const link of links) {
      link.setAttribute("aria-current", String(link.dataset.paneLink === id));
    }
  };

  const focusPaneHeading = (id: string) => {
    const pane = document.getElementById(id);
    const heading = pane?.querySelector<HTMLElement>('h2[tabindex="-1"]');
    heading?.focus({ preventScroll: true });
  };

  if (location.hash.length > 1) {
    const id = location.hash.slice(1);
    setActive(id);
    // Defer to next frame so the browser's own fragment-scroll completes first;
    // focusing earlier can race the scroll and leave the heading off-screen.
    requestAnimationFrame(() => focusPaneHeading(id));
  } else {
    setActive(panes[0]?.id ?? "");
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target instanceof HTMLElement) {
        setActive(visible.target.id);
      }
    },
    { rootMargin: "-24% 0px -58% 0px", threshold: [0.12, 0.4, 0.72] },
  );

  for (const pane of panes) observer.observe(pane);

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    setActive(id);
    focusPaneHeading(id);
  });
}
```

Two changes from the previous version:

1. `focusPaneHeading(id)` called on initial-load deep-link (deferred via `requestAnimationFrame` so the browser's fragment-scroll lands first) and on every `hashchange`.
2. `preventScroll: true` keeps focus from re-scrolling on top of the browser's own scroll — without it, `.focus()` would scroll the heading to a slightly different position than the browser's fragment-scroll, causing a visible jump.

- [ ] **Step 3: Verify the rebuild + manual keyboard probe**

```sh
bun run --cwd apps/site build
bun run --cwd apps/site preview &
sleep 4
# 1. Visit http://127.0.0.1:4321/workspace#stack — confirm: stack pane scrolled into view AND
#    after one frame the focus ring is on the "working set" heading.
# 2. Click the "Uses" nav link — confirm: focus ring jumps to "tools and current work".
# 3. From the nav link, press Tab — confirm: focus advances through the pane's content
#    (the section's h3 / list items) instead of going back to the next nav link.
# 4. Shift+Tab from inside a pane — confirm: focus returns to the nav link.
pkill -f 'astro preview'
```

- [ ] **Step 4: Commit**

```sh
git add apps/site/src/pages/workspace/index.astro apps/site/src/lib/workspace-wip-client.ts
git commit -m "feat(workspace): focus pane heading on hash navigation (a11y)"
```

---

### Task 3: Rust canvas — animation parameters

**Files:**

- Modify: `apps/wasm/canvas/src/lib.rs` (extend `render_lattice` signature with mouse + time params; perturb the lattice using them)
- Regenerate: `apps/site/public/wasm/canvas/canvas.{js,d.ts,_bg.wasm,_bg.wasm.d.ts,package.json}` (committed artifacts produced by `wasm-pack`)

**Why:** ROADMAP M5 scope item: "Wire Rust/WASM canvas into the workspace background or pane preview." Currently `render_lattice` takes only width/height — the bridge SAB is set up but no read path consumes mouse_x/y. Extending the signature to accept normalized mouse coords + a time stamp lets the JS-side rAF loop in Task 4 drive animation. The render call itself stays one-frame-per-call (Rust does not own a loop); the JS rAF schedules calls and reads SAB on each frame.

- [ ] **Step 1: Replace the `render_lattice` function in `apps/wasm/canvas/src/lib.rs`**

In `apps/wasm/canvas/src/lib.rs`, replace the existing `render_lattice` function (the entire `#[wasm_bindgen] pub fn render_lattice(...)` body) with:

```rust
#[wasm_bindgen]
pub fn render_lattice(
    canvas: HtmlCanvasElement,
    width: f64,
    height: f64,
    mouse_x_norm: f64,
    mouse_y_norm: f64,
    time_ms: f64,
) -> Result<u32, JsValue> {
    let dpr = web_sys::window()
        .map(|window| window.device_pixel_ratio())
        .unwrap_or(1.0)
        .clamp(1.0, 2.0);

    let pixel_width = (width * dpr).max(1.0).round() as u32;
    let pixel_height = (height * dpr).max(1.0).round() as u32;
    canvas.set_width(pixel_width);
    canvas.set_height(pixel_height);

    let context = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("2d canvas context unavailable"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    context.set_transform(dpr, 0.0, 0.0, dpr, 0.0, 0.0)?;
    context.clear_rect(0.0, 0.0, width, height);
    context.set_fill_style_str("#0a0a0a");
    context.fill_rect(0.0, 0.0, width, height);

    let spacing = (width / 12.0).clamp(48.0, 96.0);
    let cols = (width / spacing).ceil() as u32 + 2;
    let rows = (height / spacing).ceil() as u32 + 2;
    let mut node_count = 0;

    // mouse_x_norm / mouse_y_norm are clamped to [0, 1] by the caller. Convert
    // to lattice coordinates so a node directly under the pointer experiences
    // the strongest pull.
    let mx = mouse_x_norm.clamp(0.0, 1.0) * cols as f64;
    let my = mouse_y_norm.clamp(0.0, 1.0) * rows as f64;
    // time_ms ticks at 1 ms/frame from performance.now(); 0.0008 rad/ms ≈
    // one full sin cycle per ~1.3 s, which reads as a slow lattice "breathe".
    let time_phase = time_ms * 0.0008;

    let mut path = Path::builder();

    for row in 0..rows {
        for col in 0..cols {
            let x = col as f64 * spacing - spacing * 0.5;
            let y = row as f64 * spacing - spacing * 0.5;

            let dx = col as f64 - mx;
            let dy = row as f64 * 0.7 - my * 0.7;
            let mouse_falloff = (-(dx * dx + dy * dy) * 0.04).exp();
            let lean = ((row + col) as f64 * 0.73 + time_phase).sin() * (10.0 + mouse_falloff * 18.0);

            if col + 1 < cols {
                path.begin(point(x as f32, y as f32));
                path.line_to(point((x + spacing + lean) as f32, (y + lean * 0.25) as f32));
                path.end(false);
            }

            if row + 1 < rows {
                path.begin(point(x as f32, y as f32));
                path.line_to(point((x - lean * 0.2) as f32, (y + spacing) as f32));
                path.end(false);
            }

            node_count += 1;
        }
    }

    let path = path.build();
    let mut geometry: VertexBuffers<Point, u16> = VertexBuffers::new();
    let mut tessellator = StrokeTessellator::new();
    tessellator
        .tessellate_path(
            &path,
            &StrokeOptions::default().with_line_width(1.0),
            &mut BuffersBuilder::new(&mut geometry, |vertex: StrokeVertex| vertex.position()),
        )
        .map_err(|err| JsValue::from_str(&format!("lattice tessellation failed: {err:?}")))?;

    context.set_fill_style_str("rgba(47, 107, 255, 0.18)");
    for triangle in geometry.indices.chunks_exact(3) {
        let a = geometry.vertices[triangle[0] as usize];
        let b = geometry.vertices[triangle[1] as usize];
        let c = geometry.vertices[triangle[2] as usize];
        context.begin_path();
        context.move_to(a.x as f64, a.y as f64);
        context.line_to(b.x as f64, b.y as f64);
        context.line_to(c.x as f64, c.y as f64);
        context.close_path();
        context.fill();
    }

    context.set_fill_style_str("rgba(215, 185, 122, 0.52)");
    for row in 0..rows {
        for col in 0..cols {
            let x = col as f64 * spacing - spacing * 0.5;
            let y = row as f64 * spacing - spacing * 0.5;
            context.begin_path();
            context.arc(x, y, 1.3, 0.0, core::f64::consts::TAU)?;
            context.fill();
        }
    }

    Ok(node_count)
}
```

Three substantive changes vs the previous body:

1. Signature gains `mouse_x_norm: f64, mouse_y_norm: f64, time_ms: f64`.
2. `lean` now blends a time-phased base (`time_phase`) with a Gaussian-falloff mouse pull (`mouse_falloff` = `e^(-r²·0.04)`), so nodes near the pointer lean more.
3. Old constant `((row + col) * 0.73).sin() * 10.0` becomes `((row + col) * 0.73 + time_phase).sin() * (10.0 + mouse_falloff * 18.0)`.

- [ ] **Step 2: Verify Rust compiles**

```sh
just wasm-check
# Expected: cargo check --target wasm32-unknown-unknown --workspace passes for canvas + bridge + search.
```

- [ ] **Step 3: Lint the canvas crate**

```sh
just wasm-lint
# Expected: no clippy warnings (-D warnings is in the just target).
```

- [ ] **Step 4: Rebuild WASM artifacts**

```sh
just wasm-build
# Expected: writes apps/site/public/wasm/{bridge,canvas,search}/* artifacts.
ls -la apps/site/public/wasm/canvas/canvas_bg.wasm
# Expected: file size ≥ 50 KB (similar to before, may differ slightly).
```

- [ ] **Step 5: Commit Rust source + regenerated artifacts together**

```sh
git add apps/wasm/canvas/src/lib.rs apps/site/public/wasm/canvas/
git status --short
# Expected: M apps/wasm/canvas/src/lib.rs ; M apps/site/public/wasm/canvas/canvas.* ; M apps/site/public/wasm/canvas/canvas_bg.wasm
git commit -m "feat(canvas): render_lattice accepts mouse + time params for animation"
```

---

### Task 4: JS rAF loop reading SAB, IntersectionObserver-gated

**Files:**

- Modify: `apps/site/src/lib/workspace-wip-client.ts:1-13` (extend `CanvasModule` interface for the new signature)
- Modify: `apps/site/src/lib/workspace-wip-client.ts:124-153` (`mountCanvas` — replace static draw + ResizeObserver with a SAB-driven rAF loop, gated by IntersectionObserver)
- Modify: `apps/site/src/lib/workspace-wip-client.ts:65-77` (`mountWorkspaceWip` — pass SAB writers from `mountSharedState` into `mountCanvas` so the canvas can read them)
- Modify: `apps/site/src/lib/shared-state.ts:13-22` (extend `SharedStateWriters` to expose readers too — `readMouseX`, `readMouseY`)

**Why:** Ties together everything from Task 3. `mountSharedState` already writes mouse_x/y to the SAB on pointermove; the canvas should read those on every frame and pass them as normalized coords to `render_lattice`. The rAF loop is throttled by an IntersectionObserver so it only runs when the projects pane is on screen — saves CPU when the user is reading other panes.

- [ ] **Step 1: Add reader methods to `shared-state.ts`**

In `apps/site/src/lib/shared-state.ts`, modify the `SharedStateWriters` interface and the implementation. Find:

```ts
export interface SharedStateWriters {
  setMouse(x: number, y: number): void;
  setScrollVelocity(vx: number): void;
  setTilt(x: number, y: number): void;
  setTickTarget(hz: number): void;
  incrementFrameCounter(): number;
  readFrameCounter(): number;
}
```

Replace with:

```ts
export interface SharedStateWriters {
  setMouse(x: number, y: number): void;
  setScrollVelocity(vx: number): void;
  setTilt(x: number, y: number): void;
  setTickTarget(hz: number): void;
  incrementFrameCounter(): number;
  readFrameCounter(): number;
  readMouseX(): number;
  readMouseY(): number;
}
```

Then in the `return { sab, writers: { ... } }` block, add the two reader methods. Find:

```ts
      readFrameCounter() {
        return uints[UINTS.frameCounter];
      },
    },
  };
}
```

Replace with:

```ts
      readFrameCounter() {
        return uints[UINTS.frameCounter];
      },
      readMouseX() {
        return floats[FLOATS.mouseX];
      },
      readMouseY() {
        return floats[FLOATS.mouseY];
      },
    },
  };
}
```

The interface name "Writers" is now slightly imprecise (it carries readers too), but keeping the existing name avoids a rename cascade across `workspace-wip-client.ts` and the `SharedStateHandle` type. The cluster of read+write helpers all live behind one façade, which is fine.

- [ ] **Step 2: Update `CanvasModule` interface for the new render signature**

In `apps/site/src/lib/workspace-wip-client.ts`, find:

```ts
interface CanvasModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  render_lattice(canvas: HTMLCanvasElement, width: number, height: number): number;
}
```

Replace with:

```ts
interface CanvasModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  render_lattice(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    mouseXNorm: number,
    mouseYNorm: number,
    timeMs: number,
  ): number;
}
```

- [ ] **Step 3: Restructure `mountWorkspaceWip` so canvas can read shared state**

In `apps/site/src/lib/workspace-wip-client.ts`, find the existing `mountWorkspaceWip`:

```ts
export function mountWorkspaceWip(): void {
  const targets: StatusTargets = {
    wasm: document.querySelector('[data-wip-status="wasm"]'),
    sab: document.querySelector('[data-wip-status="sab"]'),
    canvas: document.querySelector('[data-wip-status="canvas"]'),
    search: document.querySelector('[data-wip-status="search"]'),
  };

  void mountSharedState(targets);
  mountCanvas(targets);
  mountSearch(targets);
  mountPaneNavigation();
}
```

Replace with:

```ts
export function mountWorkspaceWip(): void {
  const targets: StatusTargets = {
    wasm: document.querySelector('[data-wip-status="wasm"]'),
    sab: document.querySelector('[data-wip-status="sab"]'),
    canvas: document.querySelector('[data-wip-status="canvas"]'),
    search: document.querySelector('[data-wip-status="search"]'),
  };

  // mountSharedState resolves to the SharedStateWriters (or undefined if
  // crossOriginIsolated is false / SAB unavailable). Canvas waits for it so
  // the animation can read mouse coords; if SAB never resolves, canvas falls
  // back to a static render.
  const sharedStatePromise = mountSharedState(targets);
  void mountCanvas(targets, sharedStatePromise);
  mountSearch(targets);
  mountPaneNavigation();
}
```

- [ ] **Step 4: Change `mountSharedState` to return the writers**

In `apps/site/src/lib/workspace-wip-client.ts`, modify `mountSharedState`. Find the function signature:

```ts
async function mountSharedState(targets: StatusTargets): Promise<void> {
```

Change to:

```ts
async function mountSharedState(
  targets: StatusTargets,
): Promise<import('@lib/shared-state').SharedStateWriters | undefined> {
```

At the end of the `try` block (after the `visibilitychange` listener registration), add:

```ts
return writers;
```

In the `catch` block, change `setStatus(targets.sab, 'off');` to:

```ts
setStatus(targets.sab, "off");
return undefined;
```

The complete updated function:

```ts
async function mountSharedState(
  targets: StatusTargets,
): Promise<import("@lib/shared-state").SharedStateWriters | undefined> {
  try {
    const { writers } = createSharedState();
    const moduleUrl = new URL("/wasm/bridge/bridge.js", globalThis.location.href).href;
    const bridge = (await import(/* @vite-ignore */ moduleUrl)) as unknown as BridgeModule;
    await bridge.default();
    if (bridge.shared_state_bytes() !== 32 || bridge.shared_state_offset("frame_counter") !== 24) {
      throw new Error("bridge WASM wire format does not match the JS SharedArrayBuffer view");
    }
    setStatus(targets.sab, "ready");

    let lastX = window.scrollX;
    window.addEventListener(
      "pointermove",
      (event) => {
        writers.setMouse(event.clientX, event.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      "scroll",
      () => {
        const vx = window.scrollX - lastX;
        lastX = window.scrollX;
        writers.setScrollVelocity(vx);
      },
      { passive: true },
    );
    document.addEventListener("visibilitychange", () => {
      writers.setTickTarget(
        document.hidden ? 1 : matchMedia("(pointer: coarse)").matches ? 30 : 60,
      );
    });
    return writers;
  } catch {
    setStatus(targets.sab, "off");
    return undefined;
  }
}
```

- [ ] **Step 5: Replace `mountCanvas` with the SAB-driven rAF loop**

In `apps/site/src/lib/workspace-wip-client.ts`, replace the entire existing `mountCanvas` function (currently lines 124-153) with:

```ts
async function mountCanvas(
  targets: StatusTargets,
  sharedStatePromise: Promise<import("@lib/shared-state").SharedStateWriters | undefined>,
): Promise<void> {
  const canvas = document.getElementById("ws-rust-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  // prefers-reduced-motion users get a single static render (or none if the
  // CSS rule has hidden the canvas entirely — `display: none` short-circuits
  // getBoundingClientRect to width=0/height=0, which we guard below).
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mod: CanvasModule;
  try {
    const moduleUrl = new URL("/wasm/canvas/canvas.js", globalThis.location.href).href;
    mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as CanvasModule;
    await mod.default();
    setStatus(targets.wasm, "ready");
  } catch (error) {
    console.error("canvas: WASM load failed", error);
    setStatus(targets.wasm, "error");
    setStatus(targets.canvas, "error");
    return;
  }

  const writers = await sharedStatePromise;

  const drawFrame = (timeMs: number) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const mxNorm = writers ? writers.readMouseX() / window.innerWidth : 0.5;
    const myNorm = writers ? writers.readMouseY() / window.innerHeight : 0.5;
    mod.render_lattice(canvas, rect.width, rect.height, mxNorm, myNorm, timeMs);
  };

  // First paint so the canvas is never empty even before the rAF loop starts
  // (e.g. SAB unavailable, or pane briefly off-screen at mount).
  drawFrame(performance.now());
  setStatus(targets.canvas, "ready");

  if (reducedMotion) return;

  let rafId: number | null = null;
  const loop = (timeMs: number) => {
    drawFrame(timeMs);
    rafId = requestAnimationFrame(loop);
  };

  // Gate the loop on canvas visibility — pause when the projects pane scrolls
  // off-screen so we don't burn CPU on a hidden surface.
  const visibility = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && rafId === null) {
        rafId = requestAnimationFrame(loop);
      } else if (!visible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { threshold: 0 },
  );
  visibility.observe(canvas);

  // Resize triggers a single re-draw; the rAF loop will pick it up on the
  // next frame anyway, but a synchronous redraw avoids a one-frame stretch
  // on the new buffer dimensions.
  const resizeObserver = new ResizeObserver(() => drawFrame(performance.now()));
  resizeObserver.observe(canvas);
}
```

Key behaviors:

- WASM-load failure → status `error` + early return; no rAF scheduled. Pane remains readable (the `<p>` fallback was always visible).
- SAB unavailable → loop still runs but `mxNorm`/`myNorm` are `0.5` (lattice stays centered). `setStatus(targets.canvas, 'ready')` still fires.
- `prefers-reduced-motion: reduce` → one static render only, no loop.
- IntersectionObserver pauses the loop when the canvas leaves the viewport.

- [ ] **Step 6: Verify build + manual canvas probe**

```sh
bun run --cwd apps/site verify
# Expected: typecheck + tests + build pass.
bun run --cwd apps/site preview &
sleep 4
# Visit http://127.0.0.1:4321/workspace#projects.
# 1. Confirm: canvas shows the lattice; moving the mouse over the page (anywhere) causes
#    nodes near the pointer to lean more. Time-driven sin wave is also visible (slow breathe).
# 2. Open DevTools → Performance, record 5s on /workspace#projects then on /workspace#stack.
#    Confirm: rAF callbacks dominate while on #projects; near zero rAF activity while on #stack
#    (IntersectionObserver pauses the loop when canvas is off-screen).
# 3. Emulate prefers-reduced-motion: reduce → reload — confirm: canvas frame is gone (Task 1 CSS),
#    and DevTools shows no rAF traffic.
pkill -f 'astro preview'
```

- [ ] **Step 7: Commit**

```sh
git add apps/site/src/lib/shared-state.ts apps/site/src/lib/workspace-wip-client.ts
git commit -m "feat(workspace): SAB-driven rAF canvas, gated by IntersectionObserver"
```

---

### Task 5: Playwright workspace.spec.ts

**Files:**

- Create: `apps/site/tests/smoke/workspace.spec.ts`

**Why:** Locks in every M5 acceptance criterion as automated regression. ROADMAP M5 #1, #2, #3, #4, #5.

- [ ] **Step 1: Create the test file**

```ts
// apps/site/tests/smoke/workspace.spec.ts
import { expect, test } from "playwright/test";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4321";

test("deep link /workspace#stack opens stack pane in viewport", async ({ page }) => {
  await page.goto(`${BASE}/workspace#stack`);
  // Browser fragment-nav scrolls #stack into view; we assert the heading is on screen.
  const heading = page.locator("#stack-title");
  await expect(heading).toBeInViewport();
});

test("deep link /workspace#stack focuses the stack heading", async ({ page }) => {
  await page.goto(`${BASE}/workspace#stack`);
  // Task 2 defers focus by one rAF; wait for it.
  await expect(async () => {
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
    expect(focusedId).toBe("stack-title");
  }).toPass({ timeout: 2000 });
});

test("clicking a pane-nav link focuses the target heading", async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  await page.click('a[data-pane-link="uses"]');
  await expect(async () => {
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
    expect(focusedId).toBe("uses-title");
  }).toPass({ timeout: 2000 });
});

test("aria-current updates to the active pane on scroll", async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  await page.locator("#stack-title").scrollIntoViewIfNeeded();
  // IntersectionObserver fires async; allow it a beat.
  await expect(page.locator('a[data-pane-link="stack"]')).toHaveAttribute("aria-current", "true", {
    timeout: 2000,
  });
});

test("runtime strip transitions wasm/sab/canvas/search out of pending", async ({ page }) => {
  await page.goto(`${BASE}/workspace`);
  for (const item of ["wasm", "sab", "canvas", "search"]) {
    const status = page.locator(`[data-wip-status="${item}"]`);
    // Each status is "pending" at SSR; M5 mount logic flips it to ready / error / off.
    await expect(status).not.toHaveText(/pending/i, { timeout: 5000 });
  }
});

test("reduced-motion: canvas frame is hidden, prose fills the projects pane", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/workspace#projects`);
  // The canvas-frame block has `display: none` under the Task 1 rule; child <canvas>
  // shouldn't be in the viewport even if the projects pane is.
  const canvas = page.locator("#ws-rust-canvas");
  await expect(canvas).toBeHidden();
  // The prose column ("current build surface" heading) is on screen.
  await expect(page.locator("#projects-title")).toBeInViewport();
  await ctx.close();
});

test("WASM load failure: pane content remains readable, fallback visible", async ({ browser }) => {
  // Block the canvas WASM module to simulate a failure.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route("**/wasm/canvas/**", (route) => route.abort());
  await page.goto(`${BASE}/workspace`);
  // Pane content (project list) still renders.
  await expect(page.locator("#projects-title")).toBeInViewport();
  // Visible fallback paragraph inside .canvas-frame.
  await expect(page.locator(".canvas-frame p")).toContainText(/Rust lyon/i);
  // Status flips to "error".
  await expect(page.locator('[data-wip-status="canvas"]')).toHaveAttribute("data-state", "error", {
    timeout: 5000,
  });
  await ctx.close();
});

test("COOP/COEP headers present on /workspace, absent on /", async ({ request }) => {
  // Smoke depends on the deployed Worker (or `wrangler dev`) honoring the
  // public/_headers + middleware rules. SSR preview server doesn't apply them,
  // so this test runs ONLY against SMOKE_BASE_URL when it's a real Worker URL.
  test.skip(!process.env.SMOKE_BASE_URL, "header scope requires deployed Worker");
  const ws = await request.get(`${process.env.SMOKE_BASE_URL}/workspace`);
  expect(ws.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
  expect(ws.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  const root = await request.get(`${process.env.SMOKE_BASE_URL}/`);
  expect(root.headers()["cross-origin-embedder-policy"]).toBeUndefined();
  expect(root.headers()["cross-origin-opener-policy"]).toBeUndefined();
});

test("mobile viewport (375px) renders pane-nav as horizontal scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/workspace`);
  // Mobile media-query at <860px collapses the sidebar nav into a horizontal scroll row.
  const navBox = await page.locator(".pane-nav").boundingBox();
  expect(navBox).not.toBeNull();
  if (navBox) {
    expect(navBox.width).toBeGreaterThan(navBox.height);
  }
  await ctx.close();
});
```

- [ ] **Step 2: Run the smoke suite locally**

```sh
eval "$(SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt sops --decrypt --input-type json --output-type json infra/tofu/secrets.enc.json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value)"')"
bun run --cwd apps/site build
bun run --cwd apps/site smoke
# Expected: every test passes except `COOP/COEP headers …` which skips when SMOKE_BASE_URL is unset.
```

- [ ] **Step 3: Run against production to validate the COOP/COEP test**

```sh
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
# Expected: COOP/COEP test now runs and passes. (The webServer.command is skipped when
# SMOKE_BASE_URL is set per the existing playwright.config.ts.)
```

- [ ] **Step 4: Commit**

```sh
git add apps/site/tests/smoke/workspace.spec.ts
git commit -m "test(smoke): workspace.spec.ts covers M5 acceptance gates"
```

---

### Task 6: Open PR, merge, tag v2.2.0, smoke prod

**Files:**

- Modify: `CHANGELOG.md` (roll `[Unreleased]` → `[2.2.0]` after the feat branch merges)

- [ ] **Step 1: Push the feat branch + open PR**

```sh
git push -u origin feat/m5-workspace-alpha
gh pr create --title "feat(workspace): M5 — Workspace Alpha" --body "Closes M5 acceptance criteria from ROADMAP.md (deep links, keyboard nav, reduced-motion, WASM-failure fallback, COOP/COEP). See docs/superpowers/plans/2026-05-06-m5-workspace-alpha.md for full breakdown."
```

- [ ] **Step 2: Wait for CI green, then merge**

```sh
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 3: Watch the deploy run**

```sh
gh run list -L 1 --workflow=Deploy
# Capture the run id from the first row.
gh run watch <run-id> --exit-status
# Expected: success.
```

- [ ] **Step 4: Run prod smoke**

```sh
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
# Expected: all 9 tests pass (deep-link, focus, aria-current, runtime strip,
# reduced-motion, WASM-failure, COOP/COEP, mobile viewport, plus the existing
# landing.spec.ts cases).
```

- [ ] **Step 5: Roll the changelog on a chore branch**

```sh
git checkout -b chore/release-v2.2.0
```

In `CHANGELOG.md`, find:

```markdown
## [Unreleased]

## [2.1.0] - 2026-05-06
```

Replace with:

```markdown
## [Unreleased]

## [2.2.0] - 2026-05-06

### Added

- **Workspace Alpha (M5)** — animated WASM canvas in the projects pane (rAF loop reads mouse_x/y from the bridge SAB and feeds them to `render_lattice`; gated by IntersectionObserver to pause when the pane is off-screen). Pane headings are programmatically focusable, and hash navigation (initial-load deep links + nav-link clicks) moves focus into the pane so screen readers announce the heading. Reduced-motion users get a single-column projects pane with the canvas frame hidden entirely. Smoke suite at `apps/site/tests/smoke/workspace.spec.ts` locks every M5 acceptance gate: deep-link viewport, focus management, runtime-strip status transitions, reduced-motion layout, WASM-failure fallback, COOP/COEP header scope, mobile pane-nav layout.

## [2.1.0] - 2026-05-06
```

- [ ] **Step 6: Commit, push, open chore PR, merge, tag**

```sh
git add CHANGELOG.md
git commit -m "chore: changelog for v2.2.0"
git push -u origin chore/release-v2.2.0
gh pr create --title "chore: changelog for v2.2.0" --body "Roll [Unreleased] → [2.2.0] for M5 — Workspace Alpha."
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git tag -a v2.2.0 -m "v2.2.0"
git push origin v2.2.0
```

- [ ] **Step 7: Watch the deploy + run final prod smoke**

```sh
gh run list -L 1 --workflow=Deploy
gh run watch <run-id> --exit-status
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke
# Expected: all green; v2.2.0 tag visible in `git tag -l --sort=-v:refname`.
```

---

## Critical files referenced

| File                                            | Purpose                                                                                      | Tasks |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| `apps/site/src/pages/workspace/index.astro`     | `/workspace` SSR — adds `tabindex="-1"` to pane headings + reduced-motion CSS                | 1, 2  |
| `apps/site/src/lib/workspace-wip-client.ts`     | Mounts SAB writers + readers, animated canvas, search, pane navigation with focus management | 2, 4  |
| `apps/site/src/lib/shared-state.ts`             | SAB façade — extended with `readMouseX` / `readMouseY`                                       | 4     |
| `apps/wasm/canvas/src/lib.rs`                   | `render_lattice` Rust function — gains mouse + time params, animation math                   | 3     |
| `apps/site/public/wasm/canvas/*`                | Committed WASM artifacts; regenerated by `just wasm-build` after Rust changes                | 3     |
| `apps/site/tests/smoke/workspace.spec.ts` (new) | Playwright smoke covering all M5 acceptance gates                                            | 5     |
| `CHANGELOG.md`                                  | Roll `[Unreleased]` → `[2.2.0]`                                                              | 6     |

---

## End-to-end verification (after Tasks 1–6)

```sh
# Local
bun run verify                                          # → green (typecheck + bun:test + build)
just wasm-check && just wasm-lint                       # → both green
bun run --cwd apps/site smoke                           # → all tests pass except the COOP/COEP one (skipped sans SMOKE_BASE_URL)
SMOKE_BASE_URL=https://yanai.sh bun run --cwd apps/site smoke   # → all tests pass

# Production
curl -sI https://yanai.sh/workspace | grep -iE 'cross-origin-(embedder|opener)-policy'
# → both headers present
curl -sI https://yanai.sh/        | grep -iE 'cross-origin-(embedder|opener)-policy' || true
# → no output (apex unaffected)
git tag -l --sort=-v:refname
# → v2.2.0 (top), v2.1.0
```

## Order-of-operations notes

- **Tasks 1–5 can land in any order on the same feat branch**, but Task 4 (JS rAF loop) calls into the new `render_lattice` signature shipped in Task 3. Doing 3 before 4 means the JS code matches the WASM ABI from the moment it's committed.
- **Task 3 ships rebuilt WASM artifacts in the same commit as the Rust source** so a checkout at any commit boundary always has matching JS/WASM/types — no out-of-band step required to make a checkout build.
- **Task 6 is two PRs** — feat first, chore (changelog) second. This keeps the deploy of M5 features and the version-marker commit separable, so a hotfix between the two doesn't conflate semantics.

## Rollback per task

- **Task 1 (CSS)**: revert `workspace/index.astro`. Two-line CSS change; risk-free.
- **Task 2 (focus mgmt)**: revert `workspace/index.astro` + `workspace-wip-client.ts:319-350`. Page returns to its pre-M5 hashchange behavior.
- **Task 3 (Rust)**: revert `apps/wasm/canvas/src/lib.rs` + the regenerated `apps/site/public/wasm/canvas/*` artifacts in one go. Canvas signature reverts to width/height-only.
- **Task 4 (rAF)**: revert `workspace-wip-client.ts:124-153` + the `shared-state.ts` reader additions. Canvas falls back to one-shot draw + ResizeObserver. Requires Task 3 to be unrolled too (the signature would mismatch otherwise).
- **Task 5 (smoke)**: revert `apps/site/tests/smoke/workspace.spec.ts`. Suite reverts to landing-only coverage.
- **Task 6 (release)**: rollback workflow at `.github/workflows/rollback.yml` promotes the prior version to 100%; `git tag -d v2.2.0 && git push --delete origin v2.2.0` removes the tag.

## Post-milestone

After M5 lands as v2.2.0:

1. Update `ROADMAP.md` — strike through M5 in the Milestones table (lines 426-446).
2. Plan **M6 — Telemetry** (live counters in the telemetry pane, beacon to `infra/workers/telemetry-write/`, queries through `infra/workers/telemetry-read/`, D1 storage already provisioned by Tofu). Separate plan; expected files: `infra/workers/telemetry-write/src/handler.ts`, telemetry pane content swap in `apps/site/src/pages/workspace/index.astro`.
