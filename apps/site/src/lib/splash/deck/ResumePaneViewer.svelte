<script lang="ts">
  import { browser } from "$app/environment";
  import type { DeckPaneSharedProps } from "$lib/splash/deck/deck-pane-components";
  import {
    isResumeLayoutReadable,
    type ResumeRenderMode,
    renderResumePdf,
    resetResumePdfRender,
  } from "$lib/splash/resume-pdf";

  let {
    portfolio,
    paneOpen = false,
    paneAnimating = false,
    resumeLayout = "scroll",
  }: Pick<DeckPaneSharedProps, "portfolio" | "paneOpen" | "paneAnimating" | "resumeLayout"> =
    $props();

  const focusItems = $derived(
    portfolio.roleFocus.split(/[,·]/).map((part) => part.trim()).filter(Boolean),
  );

  const renderMode = $derived(resumeLayout);

  let pagesEl = $state<HTMLElement | undefined>(undefined);
  let fallbackVisible = $state(false);
  let skipInline = $state(false);

  $effect(() => {
    if (!browser) return;
    skipInline = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skipInline) fallbackVisible = true;
  });

  $effect(() => {
    if (!browser || skipInline || !paneOpen || paneAnimating || !pagesEl) return;
    const boxHeight =
      pagesEl.clientHeight ||
      pagesEl.parentElement?.clientHeight ||
      pagesEl.closest(".splash-canvas__resume-body")?.clientHeight ||
      0;
    if (
      !isResumeLayoutReadable(
        pagesEl.clientWidth,
        paneOpen,
        paneAnimating,
        boxHeight,
        renderMode,
      )
    ) {
      return;
    }

    const pages = pagesEl;
    const mode = renderMode;

    const load = (): void => {
      void renderResumePdf(pages, "/resume.pdf", () => {
        fallbackVisible = true;
      }, mode);
    };

    load();

    if (mode !== "fit") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const resize = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        resetResumePdfRender(pages);
        load();
      }, 140);
    });
    resize.observe(pages);

    return () => {
      resize.disconnect();
      clearTimeout(timer);
    };
  });
</script>

<div class="deck-pane deck-pane--resume" class:deck-pane--resume-fit={renderMode === "fit"}>
  <div class="resume-viewer" class:resume-viewer--fit={renderMode === "fit"} id="resume-viewer">
    {#if renderMode !== "fit"}
      {#if portfolio.hero.lede}
        <p class="deck-pane__lede">{portfolio.hero.lede}</p>
      {/if}
      <ul class="deck-pane__chips">
        {#each focusItems as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    {/if}

    <div
      id="pdf-pages"
      class="resume-pages"
      class:resume-pages--fit={renderMode === "fit"}
      bind:this={pagesEl}
      role="document"
      aria-label="Résumé pages"
    ></div>

    <div class="pdf-fallback" class:is-visible={fallbackVisible} id="pdf-fallback">
      Couldn’t render the résumé here.
      <a id="pdf-fallback-link" href="/resume.pdf">Open resume.pdf ↗</a>
    </div>
  </div>
</div>
