<script lang="ts">
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import SplashDeck from "$lib/splash/deck/SplashDeck.svelte";
  import SplashSplit from "$lib/splash/split/SplashSplit.svelte";
  import { SPLASH_SPLIT_MEDIA } from "$lib/splash/split/split-shell";
  import { portfolio as portfolioData } from "$lib/data/portfolio";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { initSplash } from "$lib/splash/client";

  type Portfolio = typeof portfolioData;

  let {
    portfolio,
    splashProjects,
    projectsLayout,
    repoMeta,
    contactAction,
    contactFormLive,
    turnstileSiteKey,
    contactEnhance,
  }: {
    portfolio: Portfolio;
    splashProjects: LabSplashProject[];
    projectsLayout: LabDemoLayout;
    repoMeta: Record<string, import("$lib/github-repo-meta").RepoMeta | null> | undefined;
    contactAction: string;
    contactFormLive: boolean;
    turnstileSiteKey: string;
    contactEnhance: SubmitFunction;
  } = $props();

  let useSplit = $state(true);

  onMount(() => {
    initSplash();
    const mq = matchMedia(SPLASH_SPLIT_MEDIA);
    const update = (): void => {
      useSplit = mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  });
</script>

{#if useSplit}
  <SplashSplit
    {portfolio}
    {splashProjects}
    {projectsLayout}
    {repoMeta}
    {contactAction}
    {contactFormLive}
    {turnstileSiteKey}
    {contactEnhance}
  />
{:else}
  <SplashDeck
    {portfolio}
    {splashProjects}
    {projectsLayout}
    {repoMeta}
    {contactAction}
    {contactFormLive}
    {turnstileSiteKey}
    {contactEnhance}
  />
{/if}
