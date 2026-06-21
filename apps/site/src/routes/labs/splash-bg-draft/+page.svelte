<script lang="ts">
  import BodyShell from '$lib/components/BodyShell.svelte';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import SplashBgDraftPreview from '$lib/labs/SplashBgDraftPreview.svelte';
  import { SPLASH_BG_DRAFTS, type SplashBgDraftId } from '$lib/labs/splash-bg-drafts';

  let active = $state<SplashBgDraftId>('paper-fog');

  const activeDraft = $derived(SPLASH_BG_DRAFTS.find((draft) => draft.id === active)!);
</script>

<SiteMeta title="Splash background drafts - yanai.sh" pathname="/labs/splash-bg-draft" />

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<BodyShell bodyClass="lab-body" htmlData={{ theme: 'dark', 'site-mode': 'splash' }} />

<div class="lab-chrome">
  <p class="lab-build-banner" role="status">
    Static background drafts · <a href="/labs/splash-bg-draft">/labs/splash-bg-draft</a>
  </p>
  <nav class="lab-demo-switch" aria-label="Lab navigation">
    <a class="lab-demo-switch__home" href="/">← yanai.sh</a>
    <a class="lab-demo-switch__link" href="/labs/splash-variants">Variant lab</a>
  </nav>
</div>

<main class="bg-draft-lab">
  <header class="bg-draft-lab__head">
    <h1>Pick a static background</h1>
    <p>
      Seven baked drafts at production resolution — no WebGL, no marbling, no grids. Paper fog is the
      charcoal + horizon mix; open it first for the full-size preview.
    </p>
  </header>

  <div class="bg-draft-lab__controls" role="toolbar" aria-label="Draft controls">
    <div class="bg-draft-lab__group" role="group" aria-label="Background draft">
      {#each SPLASH_BG_DRAFTS as draft (draft.id)}
        <button
          type="button"
          class="bg-draft-lab__chip"
          class:bg-draft-lab__chip--active={active === draft.id}
          aria-pressed={active === draft.id}
          onclick={() => (active = draft.id)}
        >
          {draft.title}
          {#if draft.recommended}
            <span class="bg-draft-lab__chip-tag">rec</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <section class="bg-draft-lab__hero" aria-label="Full-size preview">
    <SplashBgDraftPreview draft={activeDraft} full />
  </section>

  <p class="bg-draft-lab__blurb">{activeDraft.blurb}</p>

  <div class="bg-draft-lab__grid">
    {#each SPLASH_BG_DRAFTS as draft (draft.id)}
      <button type="button" class="bg-draft-lab__thumb" onclick={() => (active = draft.id)}>
        <SplashBgDraftPreview {draft} />
        <span class="bg-draft-lab__thumb-copy">
          <strong>{draft.title}</strong>
          <span>{draft.blurb}</span>
        </span>
      </button>
    {/each}
  </div>
</main>

<style>
  .bg-draft-lab {
    display: grid;
    gap: 1.25rem;
    max-width: 72rem;
    margin: 0 auto;
    padding: 1rem 1.25rem 2.5rem;
  }

  .bg-draft-lab__head h1 {
    margin: 0;
    font: 600 clamp(1.35rem, 3vw, 1.85rem) / 1.05 var(--font-heading);
    letter-spacing: -0.02em;
  }

  .bg-draft-lab__head p {
    margin: 0.55rem 0 0;
    max-width: 42rem;
    color: var(--color-subtext);
    line-height: 1.55;
  }

  .bg-draft-lab__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    align-items: center;
  }

  .bg-draft-lab__group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .bg-draft-lab__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--color-rule);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface) 82%, transparent);
    color: var(--color-maintext);
    font: 500 0.82rem/1 var(--font-body);
    cursor: pointer;
  }

  .bg-draft-lab__chip--active {
    border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-rule));
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
    color: var(--color-accent-text);
  }

  .bg-draft-lab__chip-tag {
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .bg-draft-lab__hero {
    height: min(72svh, 40rem);
    border: 1px solid var(--color-rule-strong);
    border-radius: 0.85rem;
    overflow: hidden;
  }

  .bg-draft-lab__blurb {
    margin: -0.35rem 0 0;
    color: var(--color-muted);
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .bg-draft-lab__grid {
    display: grid;
    gap: 1rem;
  }

  @media (min-width: 900px) {
    .bg-draft-lab__grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .bg-draft-lab__thumb {
    display: grid;
    gap: 0.65rem;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .bg-draft-lab__thumb :global(.bg-draft) {
    aspect-ratio: 16 / 10;
  }

  .bg-draft-lab__thumb-copy {
    display: grid;
    gap: 0.25rem;
    color: var(--color-subtext);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .bg-draft-lab__thumb-copy strong {
    color: var(--color-maintext);
    font-size: 0.88rem;
  }
</style>
