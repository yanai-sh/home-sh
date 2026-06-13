<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    bodyClass?: string;
    htmlData?: Record<string, string>;
  }

  let { bodyClass = '', htmlData = {} }: Props = $props();

  onMount(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousBodyClass = body.className;

    if (bodyClass) body.classList.add(...bodyClass.split(/\s+/).filter(Boolean));

    const previousHtml: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(htmlData)) {
      previousHtml[key] = html.getAttribute(`data-${key}`);
      html.setAttribute(`data-${key}`, value);
    }

    return () => {
      body.className = previousBodyClass;
      for (const [key, value] of Object.entries(previousHtml)) {
        if (value == null) html.removeAttribute(`data-${key}`);
        else html.setAttribute(`data-${key}`, value);
      }
    };
  });
</script>
