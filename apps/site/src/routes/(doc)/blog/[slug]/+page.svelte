<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const post = $derived(data.post);
  const pubLabel = $derived(new Date(post.pubDate).toLocaleDateString());
</script>

<article class="document-panel prose">
  <header class="document-panel__head">
    <p class="document-eyebrow">
      <time datetime={post.pubDate}>{pubLabel}</time>
    </p>
    <h1>{post.title}</h1>
    <p>{post.description}</p>
  </header>
  <div class="document-content">
    {@html post.content}
  </div>
</article>

<p class="document-back"><a href="/blog">← Blog</a></p>
