<script lang="ts">
  import { dev } from "$app/environment";
  import IconSprite from "$lib/components/IconSprite.svelte";
  import SiteMeta from "$lib/components/SiteMeta.svelte";
  import SplashAmbient from "$lib/splash/SplashAmbient.svelte";
  import SplashDeckPage from "$lib/splash/SplashDeckPage.svelte";
  import { SITE_EMAIL } from "@config/site";
  import type { SplashHomeData } from "$lib/splash/splash-home-data";

  let { data }: { data: SplashHomeData } = $props();

  const portfolio = $derived(data.portfolio);
  const roleTitle = $derived(portfolio.roleTitle);
  const roleFocus = $derived(portfolio.roleFocus);
  const hero = $derived(portfolio.hero);
</script>

<SiteMeta title={portfolio.pageTitle} pathname="/" />

{#if dev}
  <p class="dev-build-stamp" data-dev-build={__DEV_BUILD_ID__} aria-hidden="true">
    dev {__DEV_BUILD_ID__}
  </p>
{/if}

<IconSprite />
<a class="skip-link" href="#splash">Skip to splash</a>
<SplashAmbient />

<noscript>
  <div class="panel document-panel" style="margin: 2rem auto; max-width: 28rem;">
    <p>{roleTitle}</p>
    <p>{roleFocus}</p>
    {#if hero.lede}
      <p>{hero.lede}</p>
    {/if}
    <p>
      <a href="/resume.pdf">Download resume PDF</a>
      {" · "}
      <a href="mailto:{SITE_EMAIL}">Email</a>
    </p>
  </div>
</noscript>

<SplashDeckPage {data} />
