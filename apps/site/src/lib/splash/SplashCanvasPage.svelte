<script lang="ts">
  import type { SplashPageData } from "$lib/splash/splash-page-data";
  import { page } from "$app/state";
  import SplashCanvas from "$lib/splash/canvas/SplashCanvas.svelte";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { initSplash } from "$lib/splash/client";
  import { createSplashContactEnhance } from "$lib/splash/splash-contact-enhance";
  import { onMount } from "svelte";

  let { data }: { data: SplashPageData } = $props();

  const contactAction = $derived(`${page.url.pathname}?/contact`);
  const portfolio = $derived(data.portfolio);
  const splashProjects = $derived(data.splashProjects as LabSplashProject[]);
  const projectsLayout = $derived<LabDemoLayout>(
    splashProjects.length > 1 ? "cards-2col" : "cards-stack",
  );
  const contactFormLive = $derived(data.contactFormLive);
  const turnstileSiteKey = $derived(data.turnstileSiteKey);
  const contactEnhance = $derived(createSplashContactEnhance(portfolio, contactFormLive));

  onMount(() => initSplash());
</script>

{#await data.repoMeta then repoMeta}
  <SplashCanvas
    {portfolio}
    {splashProjects}
    {projectsLayout}
    {repoMeta}
    {contactAction}
    {contactFormLive}
    {turnstileSiteKey}
    {contactEnhance}
  />
{/await}
