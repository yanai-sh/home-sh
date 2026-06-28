<script lang="ts">
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { portfolio as portfolioData } from "$lib/data/portfolio";
  import StageEmailCopy from "$lib/splash/StageEmailCopy.svelte";
  import SplashDeckPane from "$lib/splash/deck/SplashDeckPane.svelte";
  import {
    CANVAS_NAV,
    type CanvasCell,
    type PanDir,
    type PanTarget,
    cellLabel,
    panDirFromKey,
    panDirToCell,
    panTarget,
  } from "$lib/splash/canvas/canvas-graph";
  import { parseCanvasHash, syncCanvasHash } from "$lib/splash/canvas/canvas-hash";
  import {
    backToProjectsGrid,
    openProjectDetail,
    siteModeFor,
    wheelPanAccum,
    wheelPanDir,
  } from "$lib/splash/canvas/canvas-model";
  import { wheelInsideCanvasCell } from "$lib/splash/canvas/canvas-wheel";
  import {
    exitDirToRest,
    isCanvasGestureSurface,
    panOffsetPercent,
    swipePanDir,
    swipeShouldScrollCell,
  } from "$lib/splash/canvas/canvas-gesture";
  import {
    seedCanvasHistoryForDeepLink,
    shouldBlockHorizontalBrowserGesture,
  } from "$lib/splash/canvas/canvas-browser-gesture";
  import { syncSplashHtmlState } from "$lib/splash/splash-html-state";
  import { SPLASH_SCROLL } from "$lib/splash/splash-dom";
  import { trapFocus } from "$lib/splash/deck/deck-focus";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { splashProjectLabel } from "$lib/splash-project-label";
  import { initContactForm } from "$lib/splash/client";
  import { SITE_SOURCE_URL } from "@config/site";
  import type { CanvasView } from "$lib/splash/canvas/canvas-hash";

  type Portfolio = typeof portfolioData;

  let {
    portfolio,
    splashProjects,
    projectsLayout,
    repoMeta,
    contactAction,
    contactFormLive,
    turnstileSiteKey,
    contactEnhance,
  }: {
    portfolio: Portfolio;
    splashProjects: LabSplashProject[];
    projectsLayout: LabDemoLayout;
    repoMeta: Record<string, import("$lib/github-repo-meta").RepoMeta | null> | undefined;
    contactAction: string;
    contactFormLive: boolean;
    turnstileSiteKey: string;
    contactEnhance: SubmitFunction;
  } = $props();

  let isRest = $state(true);
  let cell = $state<CanvasCell | null>(null);
  let view = $state<CanvasView>("dest");
  let projectSlug = $state("");
  let transitionDir = $state<PanDir | null>(null);
  let leavingCell = $state<CanvasCell | null>(null);
  let nudgeDir = $state<PanDir | null>(null);
  let canvasAnimating = $state(false);
  let wheelAccumX = $state(0);
  let wheelAccumY = $state(0);
  let panLockedUntil = 0;

  const CANVAS_MS = 320;
  const PAN_COOLDOWN_MS = 200;
  let canvasAnimTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;

  let canvasRoot = $state<HTMLElement | null>(null);
  let swipePointerId = $state<number | null>(null);
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartMs = 0;
  let swipeScrollHandoff = false;

  let touchGuardActive = false;
  let touchGuardStartX = 0;
  let touchGuardStartY = 0;
  let touchGuardInScrollCell = false;
  let touchGuardScrollHandoff = false;

  const github = $derived(portfolio.socials.find((s) => s.url.includes("github")));
  const linkedin = $derived(portfolio.socials.find((s) => s.url.includes("linkedin")));
  const activeProject = $derived(
    view === "project" ? splashProjects.find((p) => p.slug === projectSlug) : undefined,
  );
  const projectSourceHref = $derived.by((): string => {
    if (!activeProject) return SITE_SOURCE_URL;
    if (activeProject.repo) return `https://github.com/${activeProject.repo}`;
    return SITE_SOURCE_URL;
  });

  const canvasState = $derived({
    isRest,
    cell,
    view,
    projectSlug,
  });

  const reducedMotion = $derived(
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  function markCanvasAnimating(): void {
    clearTimeout(canvasAnimTimer);
    canvasAnimating = true;
    const ms = reducedMotion ? 0 : CANVAS_MS;
    canvasAnimTimer = setTimeout(() => {
      canvasAnimating = false;
      transitionDir = null;
      leavingCell = null;
    }, ms);
  }

  function beginLeave(from: CanvasCell | null): void {
    if (from) leavingCell = from;
  }

  function triggerNudge(dir: PanDir): void {
    if (reducedMotion) return;
    clearTimeout(nudgeTimer);
    nudgeDir = dir;
    nudgeTimer = setTimeout(() => {
      nudgeDir = null;
    }, 180);
  }

  function releaseSwipe(pointerId: number): void {
    if (swipePointerId !== pointerId) return;
    swipePointerId = null;
    swipeScrollHandoff = false;
    canvasRoot?.releasePointerCapture(pointerId);
  }

  function resetWheelAccum(): void {
    wheelAccumX = 0;
    wheelAccumY = 0;
    clearTimeout(wheelIdleTimer);
  }

  function bumpWheelIdle(): void {
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelAccumX = 0;
      wheelAccumY = 0;
    }, 160);
  }

  function cellMotion(_id: CanvasCell, mode: "enter" | "leave"): string {
    if (mode === "leave" || !transitionDir) return "";
    const offset = panOffsetPercent(transitionDir, "enter");
    return `--cell-x:${offset.x};--cell-y:${offset.y};`;
  }

  function goRest(syncHash = true, usePush = false, exitDir: PanDir | null = null): void {
    if (isRest && view === "dest") return;
    if (cell) beginLeave(cell);
    transitionDir = exitDir ?? (cell ? exitDirToRest(cell) : null);
    isRest = true;
    cell = null;
    view = "dest";
    projectSlug = "";
    resetWheelAccum();
    markCanvasAnimating();
    if (syncHash) syncCanvasHash(true, null, "dest", "", usePush);
  }

  function enterCell(next: CanvasCell, dir: PanDir | null = null, usePush = true): void {
    const wasRest = isRest;
    if (!wasRest && cell === next && view === "dest") {
      goRest(true, usePush, dir ? invertPanDir(dir) : null);
      return;
    }
    if (!wasRest && cell && cell !== next && dir) beginLeave(cell);
    transitionDir = dir;
    isRest = false;
    cell = next;
    view = "dest";
    projectSlug = "";
    resetWheelAccum();
    markCanvasAnimating();
    syncCanvasHash(false, next, "dest", "", usePush);
  }

  function navigateTarget(target: PanTarget, dir: PanDir, usePush = true): void {
    if (target.kind === "rest") {
      const exit = !isRest && cell ? exitDirToRest(cell) : invertPanDir(dir);
      goRest(true, usePush, exit);
      return;
    }
    enterCell(target.cell, dir, usePush);
  }

  function tryPan(dir: PanDir, usePush = true, fromKeyboard = false): boolean {
    if (view === "project") return false;
    const target = panTarget(isRest, cell, dir);
    if (!target) {
      triggerNudge(dir);
      return false;
    }
    if (!fromKeyboard && Date.now() < panLockedUntil && !canvasAnimating) return false;
    navigateTarget(target, dir, usePush);
    panLockedUntil = Date.now() + (fromKeyboard ? 0 : PAN_COOLDOWN_MS);
    return true;
  }

  function invertPanDir(dir: PanDir): PanDir {
    switch (dir) {
      case "west":
        return "east";
      case "east":
        return "west";
      case "north":
        return "south";
      case "south":
        return "north";
    }
  }

  function applyFromHash(): void {
    const target = parseCanvasHash(location.hash);
    if (target.kind === "rest") {
      isRest = true;
      cell = null;
      view = "dest";
      projectSlug = "";
      resetWheelAccum();
      return;
    }
    if (target.kind === "cell") {
      isRest = false;
      cell = target.cell;
      view = "dest";
      projectSlug = "";
      resetWheelAccum();
      return;
    }
    isRest = false;
    cell = "projects";
    view = "project";
    projectSlug = target.slug;
    resetWheelAccum();
  }

  function openCell(dest: CanvasCell): void {
    if (isRest) {
      enterCell(dest, panDirToCell({ isRest: true, cell: null }, dest), true);
      return;
    }
    if (cell === dest && view === "dest") {
      goRest(true, true);
      return;
    }
    if (cell) {
      enterCell(dest, panDirToCell({ isRest: false, cell }, dest), true);
    }
  }

  function openProject(slug: string): void {
    const next = openProjectDetail(canvasState, slug);
    isRest = next.isRest;
    cell = next.cell;
    view = next.view;
    projectSlug = next.projectSlug;
    markCanvasAnimating();
    syncCanvasHash(false, "projects", "project", slug, true);
  }

  function backToProjects(): void {
    const next = backToProjectsGrid(canvasState);
    isRest = next.isRest;
    cell = next.cell;
    view = next.view;
    projectSlug = next.projectSlug;
    markCanvasAnimating();
    syncCanvasHash(false, "projects", "dest", "", true);
  }

  function onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea";

    if (
      isRest &&
      event.key.toLowerCase() === "c" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !typing
    ) {
      event.preventDefault();
      openCell("contact");
      return;
    }

    if (view === "project" && event.key === "Escape") {
      event.preventDefault();
      backToProjects();
      return;
    }

    if (event.key === "Escape") {
      if (!isRest) {
        event.preventDefault();
        goRest(true, true);
      }
      return;
    }

    if (typing || view === "project") return;

    const dir = panDirFromKey(event.key);
    if (!dir) return;
    if (tryPan(dir, true, true)) event.preventDefault();
  }

  function onWheel(event: WheelEvent): void {
    if (view === "project") {
      if (wheelInsideCanvasCell(event)) return;
      return;
    }

    if (!isRest && wheelInsideCanvasCell(event)) return;

    if (Date.now() < panLockedUntil && !canvasAnimating) {
      resetWheelAccum();
      return;
    }

    const outcome = wheelPanAccum(wheelAccumX, wheelAccumY, event);
    if (outcome.kind === "accum") {
      if (outcome.axis === "x") wheelAccumX = outcome.value;
      else wheelAccumY = outcome.value;
      bumpWheelIdle();
      if (outcome.value !== 0) event.preventDefault();
      return;
    }

    const dir = wheelPanDir(outcome.axis, outcome.dir);
    wheelAccumX = outcome.axis === "x" ? outcome.remainder : 0;
    wheelAccumY = outcome.axis === "y" ? outcome.remainder : 0;
    event.preventDefault();
    tryPan(dir, true);
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || view === "project") return;
    if (!isCanvasGestureSurface(event.target)) return;
    swipePointerId = event.pointerId;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeStartMs = performance.now();
    swipeScrollHandoff = false;
    canvasRoot?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (swipePointerId !== event.pointerId || swipeScrollHandoff) return;
    const dx = event.clientX - swipeStartX;
    const dy = event.clientY - swipeStartY;
    if (!isRest && swipeShouldScrollCell(dx, dy)) {
      swipeScrollHandoff = true;
      releaseSwipe(event.pointerId);
    }
  }

  function onPointerUp(event: PointerEvent): void {
    if (swipePointerId !== event.pointerId || swipeScrollHandoff) {
      releaseSwipe(event.pointerId);
      return;
    }
    const dx = event.clientX - swipeStartX;
    const dy = event.clientY - swipeStartY;
    const dt = performance.now() - swipeStartMs;
    releaseSwipe(event.pointerId);
    const dir = swipePanDir(dx, dy, dt);
    if (dir) tryPan(dir, true);
  }

  function onPointerCancel(event: PointerEvent): void {
    releaseSwipe(event.pointerId);
  }

  function resetTouchGuard(): void {
    touchGuardActive = false;
    touchGuardScrollHandoff = false;
    touchGuardInScrollCell = false;
  }

  function onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    if (!isCanvasGestureSurface(event.target)) return;
    const touch = event.touches[0];
    if (!touch) return;

    touchGuardActive = true;
    touchGuardScrollHandoff = false;
    touchGuardStartX = touch.clientX;
    touchGuardStartY = touch.clientY;
    touchGuardInScrollCell =
      !isRest &&
      event.target instanceof Element &&
      Boolean(event.target.closest(`[${SPLASH_SCROLL}]`));
  }

  function onTouchMove(event: TouchEvent): void {
    if (!touchGuardActive || touchGuardScrollHandoff || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!touch) return;

    const dx = touch.clientX - touchGuardStartX;
    const dy = touch.clientY - touchGuardStartY;
    if (touchGuardInScrollCell && swipeShouldScrollCell(dx, dy)) {
      touchGuardScrollHandoff = true;
      touchGuardActive = false;
      return;
    }
    if (shouldBlockHorizontalBrowserGesture(dx, dy, touchGuardInScrollCell)) {
      event.preventDefault();
    }
  }

  function onTouchEnd(): void {
    resetTouchGuard();
  }

  function onCanvasClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-back-to-projects]")) {
      event.preventDefault();
      backToProjects();
    }
  }

  $effect(() => {
    syncSplashHtmlState(document.documentElement, {
      open: !isRest,
      active: cell ?? "projects",
      view,
      animating: canvasAnimating,
      siteMode: siteModeFor(canvasState),
    });
  });

  $effect(() => {
    if (!isRest && cell === "contact") initContactForm();
  });

  $effect(() => {
    if (isRest || typeof document === "undefined") return;
    const stage = document.querySelector<HTMLElement>(".splash-canvas__stage");
    if (!stage) return;
    return trapFocus(stage);
  });

  $effect(() => {
    const root = canvasRoot;
    if (!root || typeof window === "undefined") return;

    const passiveFalse = { passive: false };
    root.addEventListener("touchstart", onTouchStart, passiveFalse);
    root.addEventListener("touchmove", onTouchMove, passiveFalse);
    root.addEventListener("touchend", onTouchEnd, passiveFalse);
    root.addEventListener("touchcancel", onTouchEnd, passiveFalse);

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
    };
  });

  onMount(() => {
    seedCanvasHistoryForDeepLink(location.hash, location.pathname, location.search);
    applyFromHash();
    const onPopState = (): void => applyFromHash();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  });
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  bind:this={canvasRoot}
  class="splash-canvas"
  class:splash-canvas--active={!isRest}
  id="splash"
  tabindex="-1"
  data-splash-root
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
  onclick={onCanvasClick}
>
  <section class="splash-canvas__rest splash-deck__rest" aria-label="Identity">
    <div class="splash-deck__identity">
      <button
        type="button"
        class="splash-deck__name"
        class:splash-deck__name--live={!isRest}
        translate="no"
        tabindex={0}
        onclick={() => {
          if (!isRest) goRest(true, true);
        }}
      >
        {portfolio.name}
      </button>
      <div class="splash-deck__copy" inert={!isRest}>
        {#if portfolio.hero.lede}
          <p class="splash-deck__lede">{portfolio.hero.lede}</p>
        {/if}
        <p class="splash-deck__role">{portfolio.roleTitle}</p>
        <p class="splash-deck__focus">{portfolio.roleFocus}</p>
        <nav class="splash-deck__nav" aria-label="Destinations">
          {#each CANVAS_NAV as item (item.id)}
            <button
              type="button"
              class="splash-deck__link"
              data-splash-open={item.id}
              onclick={() => openCell(item.id)}>{item.label}</button
            >
          {/each}
        </nav>
        <nav class="splash-deck__social stage-glyphs" aria-label="Profiles">
          {#if github}
            <a
              class="glyph"
              href={github.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg aria-hidden="true"><use href="#icon-github" /></svg>
            </a>
          {/if}
          <StageEmailCopy />
          {#if linkedin}
            <a
              class="glyph"
              href={linkedin.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <svg aria-hidden="true"><use href="#icon-linkedin" /></svg>
            </a>
          {/if}
        </nav>
      </div>
    </div>
  </section>

  <section
    class="splash-canvas__stage"
    aria-label="Site canvas"
    inert={isRest}
    aria-hidden={isRest ? "true" : undefined}
  >
    <header class="splash-canvas__header">
      <button type="button" class="splash-canvas__home" onclick={() => goRest(true, true)}>
        {portfolio.name}
      </button>
      <nav class="splash-canvas__nav" aria-label="Canvas destinations">
        {#each CANVAS_NAV as item (item.id)}
          <button
            type="button"
            class="splash-canvas__nav-link"
            class:splash-canvas__nav-link--active={cell === item.id && view === "dest"}
            data-splash-nav={item.id}
            aria-current={cell === item.id && view === "dest" ? "page" : undefined}
            onclick={() => openCell(item.id)}>{item.label}</button
          >
        {/each}
      </nav>
    </header>

    {#if view === "project" && activeProject}
      <div class="splash-canvas__project" data-splash-pane>
        <header class="splash-canvas__project-head">
          <span>{splashProjectLabel(activeProject)}</span>
          <a
            class="splash-canvas__chip"
            id="project-source"
            href={projectSourceHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            source ↗
          </a>
        </header>
        <div class="splash-canvas__project-body" data-splash-scroll>
          <SplashDeckPane
            dest="projects"
            {view}
            {projectSlug}
            {portfolio}
            {splashProjects}
            {projectsLayout}
            {repoMeta}
            {contactAction}
            {contactFormLive}
            {turnstileSiteKey}
            {contactEnhance}
            paneOpen={!isRest}
            paneAnimating={canvasAnimating}
            onProjectSelect={openProject}
          />
        </div>
      </div>
    {:else}
      <div
        class="splash-canvas__viewport"
        class:splash-canvas__viewport--nudge-west={nudgeDir === "west"}
        class:splash-canvas__viewport--nudge-east={nudgeDir === "east"}
        class:splash-canvas__viewport--nudge-north={nudgeDir === "north"}
        class:splash-canvas__viewport--nudge-south={nudgeDir === "south"}
      >
        {#each CANVAS_NAV as item (item.id)}
          {@const active = cell === item.id}
          {@const leaving = leavingCell === item.id}
          {#if active || leaving}
            <section
              class="splash-canvas__cell"
              class:splash-canvas__cell--active={active}
              class:splash-canvas__cell--leaving={leaving && !active}
              style={cellMotion(item.id, active ? "enter" : "leave")}
              aria-label={cellLabel(item.id)}
              aria-hidden={active ? undefined : "true"}
              data-splash-cell={item.id}
            >
              {#if active || leaving}
              {#if item.id === "resume"}
                <div class="splash-canvas__cell-head">
                  <span>{item.label}</span>
                  <span class="splash-canvas__cell-actions">
                    <a
                      class="splash-canvas__chip"
                      id="pdf-open"
                      href="/resume.pdf"
                      target="_blank"
                      rel="noopener"
                    >
                      Open ↗
                    </a>
                    <a
                      class="splash-canvas__chip"
                      id="pdf-download"
                      href="/resume.pdf"
                      download="yanai-klugman-resume.pdf"
                    >
                      Download
                    </a>
                  </span>
                </div>
              {:else}
                <div class="splash-canvas__cell-head">
                  <span>{item.label}</span>
                </div>
              {/if}
              {#if item.id === "resume"}
                <div class="splash-canvas__resume-body" data-splash-pane>
                  <SplashDeckPane
                    dest={item.id}
                    view="dest"
                    projectSlug=""
                    {portfolio}
                    {splashProjects}
                    {projectsLayout}
                    {repoMeta}
                    {contactAction}
                    {contactFormLive}
                    {turnstileSiteKey}
                    {contactEnhance}
                    paneOpen={!isRest}
                    paneAnimating={canvasAnimating}
                    resumeLayout="fit"
                    onProjectSelect={openProject}
                  />
                </div>
              {:else}
              <div class="splash-canvas__scroll" data-splash-scroll data-splash-pane>
                <SplashDeckPane
                  dest={item.id}
                  view="dest"
                  projectSlug=""
                  {portfolio}
                  {splashProjects}
                  {projectsLayout}
                  {repoMeta}
                  {contactAction}
                  {contactFormLive}
                  {turnstileSiteKey}
                  {contactEnhance}
                  paneOpen={!isRest}
                  paneAnimating={canvasAnimating}
                  onProjectSelect={openProject}
                />
              </div>
              {/if}
              {/if}
            </section>
          {/if}
        {/each}
      </div>
    {/if}
  </section>
</article>
