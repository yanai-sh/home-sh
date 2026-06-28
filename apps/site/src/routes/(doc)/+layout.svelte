<script lang="ts">
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import DocumentChrome from '$lib/components/DocumentChrome.svelte';
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

<DocumentChrome>
  {@render children()}
</DocumentChrome>
