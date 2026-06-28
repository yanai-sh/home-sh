<script lang="ts">
  import { page } from '$app/state';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import DocumentChrome from '$lib/components/DocumentChrome.svelte';

  let { error }: { error?: App.Error } = $props();

  const status = $derived(page.status);
  const detail = $derived(error?.message ?? page.error?.message);

  const copy = $derived.by(() => {
    if (status === 404) {
      return {
        title: '404 - yanai.sh',
        heading: 'Page not found',
        body: 'This route does not exist.',
      };
    }
    if (status === 403) {
      return {
        title: '403 - yanai.sh',
        heading: 'Access denied',
        body: detail ?? 'You do not have permission to view this page.',
      };
    }
    if (status === 401) {
      return {
        title: '401 - yanai.sh',
        heading: 'Sign in required',
        body: detail ?? 'Sign in is required to view this page.',
      };
    }
    if (status >= 500) {
      return {
        title: 'Error - yanai.sh',
        heading: 'Something went wrong',
        body:
          import.meta.env.DEV && detail
            ? detail
            : 'Please try again in a moment.',
      };
    }
    return {
      title: 'Error - yanai.sh',
      heading: 'Request failed',
      body: detail ?? 'Something went wrong.',
    };
  });
</script>

<SiteMeta title={copy.title} pathname={page.url.pathname} />

<DocumentChrome>
  <article class="error-page panel" data-status={String(status)}>
    <header class="error-page__head">
      <p class="document-eyebrow">Error {status}</p>
      <h1>{copy.heading}</h1>
      <p>{copy.body}</p>
    </header>
    <div class="error-page__actions">
      <a class="button-link button-link--primary" href="/">Back to home</a>
    </div>
  </article>
</DocumentChrome>
