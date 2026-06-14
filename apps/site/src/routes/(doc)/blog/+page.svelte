<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<article class="document-panel">
  <header class="document-panel__head">
    <h1>Blog</h1>
    <p>Notes on systems, integration, and shipping software.</p>
  </header>

  {#if data.posts.length === 0}
    <p>No posts yet.</p>
  {:else}
    <ul class="document-list">
      {#each data.posts as post (post.slug)}
        <li>
          <a href="/blog/{post.slug}">{post.title}</a>
          <time datetime={post.pubDate}>{new Date(post.pubDate).toLocaleDateString()}</time>
          <p>{post.description}</p>
        </li>
      {/each}
    </ul>
  {/if}
</article>
