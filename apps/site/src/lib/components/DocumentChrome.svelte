<script lang="ts">
  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<a class="skip-link" href="#main">Skip to content</a>

<header class="document-header">
  <a class="document-header__home" href="/">yanai.sh</a>
  <nav class="document-header__nav" aria-label="Site">
    <a href="/blog">Blog</a>
    <span class="document-header__sep" aria-hidden="true">·</span>
    <a href="/uses">Uses</a>
    <span class="document-header__sep" aria-hidden="true">·</span>
    <a href="/now">Now</a>
  </nav>
</header>

<main class="document-main" id="main">
  {@render children()}
</main>
