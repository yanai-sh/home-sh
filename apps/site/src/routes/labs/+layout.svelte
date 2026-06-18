<script lang="ts">
  import '../../styles/splash-tokens.css';
  import '../../styles/labs-preview.css';

  let { children }: { children: import('svelte').Snippet } = $props();
</script>

{@render children()}
