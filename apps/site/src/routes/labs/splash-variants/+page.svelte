<script lang="ts">
  import BodyShell from "$lib/components/BodyShell.svelte";
  import SiteMeta from "$lib/components/SiteMeta.svelte";
  import SplashVariantMock from "$lib/labs/SplashVariantMock.svelte";
</script>

<SiteMeta title="Splash variant comparison - yanai.sh" pathname="/labs/splash-variants" />

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<BodyShell bodyClass="lab-body" htmlData={{ theme: "dark" }} />

<div class="lab-chrome">
  <p class="lab-build-banner" role="status">
    Ambient direction lab · <a href="/labs/splash-variants">/labs/splash-variants</a>
  </p>
  <nav class="lab-demo-switch" aria-label="Lab navigation">
    <a class="lab-demo-switch__home" href="/">← yanai.sh</a>
    <a class="lab-demo-switch__link" href="/labs/splash-bg-draft">BG drafts</a>
  </nav>
</div>

<main class="lab-page">
  <header class="lab-header">
    <div class="lab-header__copy">
      <h1>Splash ambient: pick a direction</h1>
      <p>
        Three mockups at production scale. No marbling, ink, or smoke. Same split-pane shell in all
        cases: only the background and type weight change.
      </p>
    </div>
  </header>

  <div class="variant-grid">
    <SplashVariantMock
      variant="hybrid"
      title="1 · Hybrid"
      recommended
      description="Typography leads on a flat surface: no ambient layer. Same as typographic for now; split-pane carries the motion."
    />
    <SplashVariantMock
      variant="instrument"
      title="2 · Full instrument"
      description="Lattice, field lines, glowing nodes. Strongest 'systems engineer' signal; easiest to overdo into HUD cosplay."
    />
    <SplashVariantMock
      variant="typographic"
      title="3 · Pure typographic"
      description="Flat surface only. Wow lives in name scale, split-pane springs, and View Transitions: no live ambient layer."
    />
  </div>
</main>

<style>
  .variant-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(1rem, 2.5vw, 1.75rem);
    padding-top: 0.5rem;
  }

  @media (max-width: 960px) {
    .variant-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
