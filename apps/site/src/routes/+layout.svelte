<script lang="ts">
  import '../styles/global.css';

  let { children }: { children: import('svelte').Snippet } = $props();
</script>

{@render children()}
