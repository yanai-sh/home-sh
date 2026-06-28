<script lang="ts">
  import IconSprite from "$lib/components/IconSprite.svelte";
  import SiteMeta from "$lib/components/SiteMeta.svelte";
  import SplashAmbient from "$lib/splash/SplashAmbient.svelte";
  import SplashCanvasPage from "$lib/splash/SplashCanvasPage.svelte";
  import SplashLabChrome from "$lib/splash/SplashLabChrome.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<SiteMeta title="Splash canvas lab (archived) - yanai.sh" pathname="/labs/splash-canvas" />

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<IconSprite />

<SplashLabChrome>
  Archived trick-room canvas experiment · production uses flyout deck ·
  <a href="/">← yanai.sh</a>
</SplashLabChrome>

<SplashAmbient />

<SplashCanvasPage {data} />
