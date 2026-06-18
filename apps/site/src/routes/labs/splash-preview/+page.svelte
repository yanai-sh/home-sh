<script lang="ts">
  import BodyShell from '$lib/components/BodyShell.svelte';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import SplashBitsPanel from '$lib/labs/SplashBitsPanel.svelte';
  import SplashTokensPanel from '$lib/labs/SplashTokensPanel.svelte';
</script>

<SiteMeta title="Splash design preview — yanai.sh" pathname="/labs/splash-preview" />

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<BodyShell bodyClass="lab-body" htmlData={{ theme: 'dark' }} />

<main class="lab-page">
  <header class="lab-header">
    <div class="lab-header__copy">
      <a class="lab-header__home" href="/">← yanai.sh</a>
      <h1>Splash design preview</h1>
      <p>
        Side-by-side mockups using the baked ink still (not the live field). Click <strong>Resume</strong>
        on each panel to compare flyout behavior. This page is for evaluation only — not linked from
        the live splash.
      </p>
    </div>
    <ThemeToggle />
  </header>

  <div class="lab-grid">
    <SplashTokensPanel />
    <SplashBitsPanel />
  </div>
</main>
