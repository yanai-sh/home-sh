<script lang="ts">
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import BodyShell from '$lib/components/BodyShell.svelte';
  import { page } from '$app/state';

  let { children }: { children: import('svelte').Snippet } = $props();

  const title = $derived(
    typeof page.data.title === 'string' ? page.data.title : 'yanai.sh',
  );
  const pathname = $derived(
    typeof page.data.pathname === 'string' ? page.data.pathname : page.url.pathname,
  );
</script>

<SiteMeta {title} {pathname} />

<BodyShell bodyClass="document-body" htmlData={{ theme: 'dark' }} />

<header class="document-header">
  <a class="document-header__home" href="/">yanai.sh</a>
</header>

<main class="document-main">
  {@render children()}
</main>
