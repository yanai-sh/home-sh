<script lang="ts">
  import type { SplashBgDraft } from './splash-bg-drafts';

  let {
    draft,
    full = false,
  }: {
    draft: SplashBgDraft;
    full?: boolean;
  } = $props();
</script>

<article class="bg-draft" class:bg-draft--full={full} data-draft={draft.id}>
  <div class="bg-draft__ambient" style:background-image="url('{draft.still}')"></div>
  <div class="bg-draft__shade" aria-hidden="true"></div>
  <div class="bg-draft__stage">
    <h2 class="bg-draft__name">Yanai Klugman</h2>
    <p class="bg-draft__role">Software & Systems Engineer</p>
    <nav class="bg-draft__nav" aria-label="Preview navigation">
      <span>Resume</span>
      <span>Contact</span>
      <span>Projects</span>
    </nav>
  </div>
  {#if !full}
    <p class="bg-draft__label">{draft.title}</p>
  {/if}
</article>

<style>
  .bg-draft {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--color-rule-strong);
    border-radius: 0.85rem;
    background: var(--splash-base, #05080c);
    min-height: 0;
  }

  .bg-draft--full {
    border: none;
    border-radius: 0;
    height: 100%;
  }

  .bg-draft__ambient {
    position: absolute;
    inset: 0;
    background-color: var(--splash-base, #05080c);
    background-size: cover;
    background-position: center;
  }

  .bg-draft__shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse 95% 85% at 50% 48%,
      transparent 0%,
      rgba(0, 0, 0, 0.06) 78%,
      rgba(0, 0, 0, 0.16) 100%
    );
  }

  .bg-draft--full .bg-draft__shade {
    opacity: 0.35;
  }

  .bg-draft__stage {
    position: relative;
    z-index: 1;
    padding: clamp(1.35rem, 4vw, 2.25rem);
  }

  .bg-draft--full .bg-draft__stage {
    padding-top: clamp(4.5rem, 16vh, 7rem);
    padding-inline: clamp(1.25rem, 4vw, 3.5rem);
  }

  .bg-draft__name {
    margin: 0;
    font: 650 clamp(1.55rem, 4.5vw, 2.35rem) / 0.98 var(--font-heading);
    letter-spacing: -0.03em;
    color: var(--color-maintext);
  }

  .bg-draft__role {
    margin: 0.55rem 0 0;
    color: var(--color-subtext);
    font: 400 0.92rem/1.45 var(--font-body);
  }

  .bg-draft__nav {
    display: grid;
    gap: 0.55rem;
    margin-top: 1.35rem;
    font: 550 1rem/1.35 var(--font-body);
    color: var(--color-maintext);
  }

  .bg-draft__label {
    position: absolute;
    z-index: 2;
    left: 0.85rem;
    bottom: 0.75rem;
    margin: 0;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface) 78%, transparent);
    border: 1px solid var(--color-rule);
    color: var(--color-subtext);
    font: 500 0.72rem/1 var(--font-body);
    backdrop-filter: blur(8px);
  }
</style>
