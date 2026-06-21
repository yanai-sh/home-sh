<script lang="ts">
  import "../../styles/splash-theme.css";
  import "../../styles/splash.css";
  import "../../styles/labs-preview.css";

  let { children }: { children: import("svelte").Snippet } = $props();
</script>

{@render children()}
