<script lang="ts">
  import '../styles/global.css';
  import { onNavigate } from '$app/navigation';

  let { children }: { children: import('svelte').Snippet } = $props();

  // Cross-document-feel transitions between routes using the View Transitions
  // API. Enhancement only — browsers without it (or with reduced motion) just
  // navigate normally.
  onNavigate((navigation) => {
    if (typeof document === 'undefined' || !document.startViewTransition) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

{@render children()}
