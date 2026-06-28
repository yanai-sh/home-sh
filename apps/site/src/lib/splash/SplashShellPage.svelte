<script lang="ts">
  import type { SplashPageData } from "$lib/splash/splash-page-data";
  import { page } from "$app/state";
  import SplashShell from "$lib/splash/SplashShell.svelte";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { createSplashContactEnhance } from "$lib/splash/splash-contact-enhance";

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
</script>

{#await data.repoMeta then repoMeta}
  <SplashShell
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
