<script lang="ts">
  import { page } from '$app/state';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import BodyShell from '$lib/components/BodyShell.svelte';
</script>

<SiteMeta title="404 — yanai.sh" pathname={page.url.pathname} />

<BodyShell bodyClass="document-body" htmlData={{ theme: 'dark' }} />

<main class="document-main document-panel">
  <h1>404</h1>
  <p>This route does not exist.</p>
  <p><a href="/">Back to home</a></p>
</main>
