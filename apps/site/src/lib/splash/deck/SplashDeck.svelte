<script lang="ts">
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { portfolio as portfolioData } from "$lib/data/portfolio";
  import StageEmailCopy from "$lib/splash/StageEmailCopy.svelte";
  import SplashDeckPane from "$lib/splash/deck/SplashDeckPane.svelte";
  import {
    DECK_CENTER,
    DECK_NAV,
    type DeckDest,
    type DeckView,
    backToProjectsGrid,
    deckIndex,
    openProjectDetail,
    siteModeFor,
    slotRole,
    stepDeck,
    wheelDeltaPx,
    wheelDismissWhenOpen,
    wheelIsHorizontal,
    wheelOpenFromRest,
    wheelStepDeck,
  } from "$lib/splash/deck/deck-model";
  import { parseDeckHash, syncDeckHash } from "$lib/splash/deck/deck-hash";
  import { wheelInsideDeckPane } from "$lib/splash/deck/deck-wheel";
  import { syncSplashHtmlState } from "$lib/splash/splash-html-state";
  import { trapFocus } from "$lib/splash/deck/deck-focus";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { splashProjectLabel } from "$lib/splash-project-label";
  import { initContactForm } from "$lib/splash/client";
  import { SITE_SOURCE_URL } from "@config/site";

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

  let open = $state(false);
  let active = $state<DeckDest>(DECK_CENTER);
  let view = $state<DeckView>("dest");
  let projectSlug = $state("");
  let wheelAccum = $state(0);
  let wheelHAccum = $state(0);
  let deckAnimating = $state(false);

  const DECK_MORPH_MS = 480;
  const DECK_SLIDE_MS = 380;
  const STEP_COOLDOWN_MS = DECK_SLIDE_MS + 40;
  let deckAnimTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
  let stepLockedUntil = 0;

  function markDeckMorphing(): void {
    if (typeof document === "undefined") return;
    clearTimeout(deckAnimTimer);
    deckAnimating = true;
    deckAnimTimer = setTimeout(() => {
      deckAnimating = false;
    }, DECK_MORPH_MS);
  }

  function markDeckSlide(): void {
    clearTimeout(deckAnimTimer);
    deckAnimating = true;
    deckAnimTimer = setTimeout(() => {
      deckAnimating = false;
    }, DECK_SLIDE_MS);
  }

  function resetWheelAccum(): void {
    wheelAccum = 0;
    wheelHAccum = 0;
    clearTimeout(wheelIdleTimer);
  }

  function setWheelAccum(value: number): void {
    wheelAccum = value;
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelAccum = 0;
    }, 160);
  }

  function setWheelHAccum(value: number): void {
    wheelHAccum = value;
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelHAccum = 0;
    }, 160);
  }

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

  function applyFromHash(): void {
    const target = parseDeckHash(location.hash);
    if (target.kind === "splash") {
      closeDeck(false);
      return;
    }
    if (target.kind === "dest") {
      active = target.dest;
      view = "dest";
      projectSlug = "";
      open = true;
      resetWheelAccum();
      markDeckMorphing();
      return;
    }
    active = "projects";
    view = "project";
    projectSlug = target.slug;
    open = true;
    resetWheelAccum();
    markDeckMorphing();
  }

  function openDeck(dest: DeckDest): void {
    if (open && active === dest && view === "dest") {
      closeDeck();
      return;
    }
    const wasOpen = open;
    active = dest;
    view = "dest";
    projectSlug = "";
    open = true;
    resetWheelAccum();
    if (wasOpen) markDeckSlide();
    else markDeckMorphing();
  }

  function closeDeck(syncHash = true): void {
    open = false;
    view = "dest";
    projectSlug = "";
    resetWheelAccum();
    markDeckMorphing();
    if (syncHash) syncDeckHash(false, active, "dest", "");
  }

  function go(dir: -1 | 1): void {
    if (view === "project") return;
    const next = stepDeck(active, dir);
    if (next === active) return;
    active = next;
    markDeckSlide();
  }

  function openProject(slug: string): void {
    const next = openProjectDetail({ open: true, active, view, projectSlug }, slug);
    open = next.open;
    active = next.active;
    view = next.view;
    projectSlug = next.projectSlug;
    markDeckMorphing();
  }

  function backToProjects(): void {
    const next = backToProjectsGrid({ open, active, view, projectSlug });
    view = next.view;
    projectSlug = next.projectSlug;
    active = next.active;
    markDeckSlide();
  }

  function onViewportClick(event: MouseEvent): void {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-splash-pane]")) return;
    closeDeck();
  }

  function onDeckClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-back-to-projects]")) {
      event.preventDefault();
      backToProjects();
      return;
    }

    if (!open) return;

    const keepOpen =
      target.closest("[data-splash-pane]") ||
      target.closest(".splash-deck__map") ||
      target.closest(".splash-deck__name") ||
      target.closest("[data-splash-open]") ||
      target.closest("[data-splash-map]");

    if (!keepOpen) closeDeck();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (
      !open &&
      event.key.toLowerCase() === "c" &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag !== "input" && tag !== "textarea") {
        event.preventDefault();
        openDeck("contact");
      }
      return;
    }

    if (!open) return;

    if (view === "project" && event.key === "Escape") {
      event.preventDefault();
      backToProjects();
      return;
    }

    if (event.key === "Escape" || event.key === "ArrowUp") {
      event.preventDefault();
      closeDeck();
      return;
    }
    if (view === "project") return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  }

  function onWheel(event: WheelEvent): void {
    if (!open) {
      if (wheelIsHorizontal(event)) return;
      const result = wheelOpenFromRest(wheelAccum, event);
      if (wheelDeltaPx(event) < 0) event.preventDefault();
      if (result === "open") {
        openDeck(DECK_CENTER);
        return;
      }
      setWheelAccum(result);
      return;
    }

    if (view === "project") {
      if (wheelInsideDeckPane(event)) return;
      const result = wheelDismissWhenOpen(wheelAccum, event);
      const dy = wheelDeltaPx(event);
      if (dy !== 0) event.preventDefault();
      if (result === "close") {
        closeDeck();
        return;
      }
      setWheelAccum(result);
      return;
    }

    if (wheelIsHorizontal(event)) {
      event.preventDefault();
      if (Date.now() < stepLockedUntil) {
        wheelHAccum = 0;
        return;
      }
      const result = wheelStepDeck(wheelHAccum, event);
      if (result.kind === "step") {
        go(result.dir);
        wheelHAccum = result.remainder;
        wheelAccum = 0;
        stepLockedUntil = Date.now() + STEP_COOLDOWN_MS;
        markDeckSlide();
        return;
      }
      setWheelHAccum(result.value);
      wheelAccum = 0;
      return;
    }

    if (wheelInsideDeckPane(event)) return;

    const result = wheelDismissWhenOpen(wheelAccum, event);
    const dy = wheelDeltaPx(event);
    if (dy !== 0) event.preventDefault();
    if (result === "close") {
      closeDeck();
      return;
    }
    setWheelAccum(result);
    wheelHAccum = 0;
  }

  $effect(() => {
    syncSplashHtmlState(document.documentElement, {
      open,
      active,
      view,
      animating: deckAnimating,
      siteMode: siteModeFor(open, active, view),
    });
    if (open) syncDeckHash(open, active, view, projectSlug);
  });

  $effect(() => {
    if (open && active === "contact") initContactForm();
  });

  $effect(() => {
    if (!open || typeof document === "undefined") return;
    const stage = document.querySelector<HTMLElement>(".splash-deck__stage");
    if (!stage) return;
    return trapFocus(stage);
  });

  onMount(() => {
    applyFromHash();
    const onPopState = (): void => applyFromHash();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  });
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="splash-deck"
  class:splash-deck--open={open}
  id="splash"
  tabindex="-1"
  data-splash-root
  onwheel={onWheel}
  onclick={onDeckClick}
>
  <section class="splash-deck__rest" aria-label="Identity">
    <div class="splash-deck__identity">
      <button
        type="button"
        class="splash-deck__name"
        class:splash-deck__name--live={open}
        translate="no"
        onclick={() => {
          if (open) closeDeck();
        }}
        tabindex={0}
      >
        {portfolio.name}
      </button>
      <div class="splash-deck__copy" inert={open}>
        {#if portfolio.hero.lede}
          <p class="splash-deck__lede">{portfolio.hero.lede}</p>
        {/if}
        <p class="splash-deck__role">{portfolio.roleTitle}</p>
        <p class="splash-deck__focus">{portfolio.roleFocus}</p>
        <nav class="splash-deck__nav" aria-label="Destinations">
          {#each DECK_NAV as item (item.id)}
            <button
              type="button"
              class="splash-deck__link"
              data-splash-open={item.id}
              onclick={() => openDeck(item.id)}>{item.label}</button
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

  <section class="splash-deck__stage" aria-label="Destinations deck" inert={!open}>
    {#if view === "project" && activeProject}
      <div class="splash-deck__project-panel" data-splash-pane>
        <header class="splash-deck__chrome">
          <span>{splashProjectLabel(activeProject)}</span>
          <a
            class="splash-deck__chip"
            id="project-source"
            href={projectSourceHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            source ↗
          </a>
        </header>
        <div class="splash-deck__body">
          <SplashDeckPane
            dest={active}
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
            paneOpen={open}
            paneAnimating={deckAnimating}
            onProjectSelect={openProject}
          />
        </div>
      </div>
    {:else}
      <div class="splash-deck__viewport" onclick={onViewportClick}>
        <div class="splash-deck__track" style:--active={deckIndex(active)}>
          {#each DECK_NAV as item (item.id)}
            {@const role = slotRole(active, item.id)}
            <button
              type="button"
              class="splash-deck__slot"
              class:splash-deck__slot--before={role === "before"}
              class:splash-deck__slot--active={role === "active"}
              class:splash-deck__slot--after={role === "after"}
              aria-current={role === "active" ? "step" : undefined}
              tabindex={role === "active" ? 0 : -1}
              onclick={() => {
                if (role !== "active") {
                  active = item.id;
                  markDeckSlide();
                }
              }}
            >
              <div class="splash-deck__pane" data-splash-pane>
                <header class="splash-deck__chrome">
                  <span>{item.label}</span>
                  {#if role === "active" && item.id === "resume"}
                    <span class="splash-deck__chrome-actions">
                      <a
                        class="splash-deck__chip"
                        id="pdf-open"
                        href="/resume.pdf"
                        target="_blank"
                        rel="noopener"
                      >
                        Open ↗
                      </a>
                      <a
                        class="splash-deck__chip"
                        id="pdf-download"
                        href="/resume.pdf"
                        download="yanai-klugman-resume.pdf"
                      >
                        Download
                      </a>
                    </span>
                  {/if}
                </header>
                <div
                  class="splash-deck__body"
                  class:splash-deck__body--peek={role !== "active"}
                  aria-hidden={role !== "active" ? "true" : undefined}
                >
                  {#if role === "active"}
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
                      paneOpen={open}
                      paneAnimating={deckAnimating}
                      onProjectSelect={openProject}
                    />
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <nav class="splash-deck__map" aria-label="Deck position">
      {#each DECK_NAV as item (item.id)}
        <button
          type="button"
          class="splash-deck__map-item"
          class:splash-deck__map-item--active={active === item.id && view === "dest"}
          data-splash-map={item.id}
          aria-current={active === item.id && view === "dest" ? "step" : undefined}
          onclick={() => openDeck(item.id)}>{item.label}</button
        >
      {/each}
      <span class="splash-deck__map-track" aria-hidden="true"
        ><i style:--i={DECK_NAV.findIndex((n) => n.id === active)}></i></span
      >
    </nav>
  </section>
</article>
