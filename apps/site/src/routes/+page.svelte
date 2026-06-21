<script lang="ts">
  import SplashHomePage from '$lib/splash/SplashHomePage.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<SplashHomePage {data} />
