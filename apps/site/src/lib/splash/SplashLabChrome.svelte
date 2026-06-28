<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="lab-chrome">
  <p class="lab-build-banner" role="status">
    {@render children()}
  </p>
</div>
